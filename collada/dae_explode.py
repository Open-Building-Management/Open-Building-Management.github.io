"""dae explosion"""
import argparse
import xml.etree.ElementTree as ET
from copy import deepcopy
from pathlib import Path

from dae_explore import local_tag

GROUPS = ['group_0', 'group_1', 'group_2', 'group_3', 'Différence']

CAMERA = "camera"
GEOMETRY = "geometry"
NODE = "node"
SKETCHUP = "SketchUp"
SCENE = "scene"

VS = f"visual_{SCENE}"
IC = f'instance_{CAMERA}'
IG = f'instance_{GEOMETRY}'
IVS = f"instance_{VS}"
LVS = f"library_{VS}s"

SCENE_XPATH = f'./{{*}}{SCENE}'
NODE_XPATH = f'./{{*}}{NODE}'
IVS_XPATH = f'./{{*}}{IVS}'
VS_XPATHS = f'./{{*}}{LVS}/{{*}}{VS}'


def get_namespaces(filename):
    """Préserve les namespaces du fichier original."""
    for _, (prefix, uri) in ET.iterparse(
        filename, events=('start-ns',)
    ):
        ET.register_namespace(prefix, uri)


def export_fusion(source, root, visual_scene):
    """fusionne tous les groupes et les injecte dans un dae"""
    # Dupliquer le document
    new_root = deepcopy(root)
    # Retrouver la scène
    new_visual_scene = next(
        (
            vs for vs in new_root.findall(
                VS_XPATHS
            )
            if vs.get('id') == visual_scene.get('id')
        ),
        None
    )
    if new_visual_scene is None:
        return
    # Retrouver SketchUp
    new_sketchup = next(
        (
            node for node in new_visual_scene.findall(NODE_XPATH)
            if (node.get('name') or node.get('id')) == SKETCHUP
        ),
        None
    )
    if new_sketchup is None:
        return
    # Créer le nouvel objet fusion
    fusion = ET.Element(
        new_sketchup.tag,
        {
            'id': 'fusion',
            'name': 'fusion'
        }
    )
    # Déplacer les groupes sélectionnés dans fusion
    for child in list(new_sketchup):
        if local_tag(child) == NODE:
            name = child.get('name') or child.get('id')
            if name in GROUPS:
                new_sketchup.remove(child)
                fusion.append(child)
        elif local_tag(child) in (IG, IC):
            new_sketchup.remove(child)
    new_sketchup.append(fusion)
    # Export
    output = source.with_name(
        f"{source.stem}-fusion.dae"
    )
    ET.ElementTree(new_root).write(
        output,
        encoding='utf-8',
        xml_declaration=True
    )
    print(f"Fusion exportée : {output}")


def get_source_root_scene_sketchup(filename):
    """get the various containers"""
    source = Path(filename)
    if not source.exists():
        print(f"Fichier introuvable : {source}")
        return
    get_namespaces(source)
    tree = ET.parse(source)
    root = tree.getroot()
    # Identifier la scène active
    scene = root.find(SCENE_XPATH)
    visual_scene_id = None
    if scene is not None:
        instance = scene.find(IVS_XPATH)
        if instance is not None:
            visual_scene_id = instance.get('url', '').lstrip('#')
    # Retrouver la visual_scene
    visual_scenes = root.findall(
        VS_XPATHS
    )
    visual_scene = next(
        (
            vs for vs in visual_scenes
            if vs.get('id') == visual_scene_id
        ),
        visual_scenes[0] if visual_scenes else None
    )
    if visual_scene is None:
        print("Aucune visual_scene trouvée.")
        return
    # Identifier le conteneur SketchUp
    sketchup = next(
        (
            node for node in visual_scene.findall(NODE_XPATH)
            if (node.get('name') or node.get('id')) == SKETCHUP
        ),
        None
    )
    if sketchup is None:
        print("Groupe SketchUp introuvable.")
        return
    return source, root, visual_scene, sketchup


def extract_groups(filename):
    """produit un nouveau fichier dae par groupe déclaré"""
    result = get_source_root_scene_sketchup(filename)
    if result is None:
        return
    source, root, visual_scene, sketchup = result
    # Identifier les groupes disponibles
    available = {
        node.get('name') or node.get('id'): node
        for node in sketchup.findall(NODE_XPATH)
    }
    # Extraction
    for group_name in GROUPS:
        if group_name not in available:
            print(f"Groupe introuvable : {group_name}")
            continue
        # Dupliquer le document complet
        new_root = deepcopy(root)
        # Retrouver la scène dans la copie
        new_visual_scene = next(
            (
                vs for vs in new_root.findall(
                    VS_XPATHS
                )
                if vs.get('id') == visual_scene.get('id')
            ),
            None
        )
        if new_visual_scene is None:
            continue
        # Retrouver SketchUp dans la copie
        new_sketchup = next(
            (
                node for node in new_visual_scene.findall(NODE_XPATH)
                if (node.get('name') or node.get('id')) == SKETCHUP
            ),
            None
        )
        if new_sketchup is None:
            continue
        # Ne conserver que le groupe demandé
        # Les transformations du parent SketchUp sont conservées.
        for child in list(new_sketchup):
            tag = local_tag(child)
            if tag == NODE:
                name = child.get('name') or child.get('id')
                if name != group_name:
                    new_sketchup.remove(child)
            elif tag in (IG, IC):
                new_sketchup.remove(child)
        # Enregistrer
        output = source.with_name(
            f"{source.stem}-{group_name}.dae"
        )
        ET.ElementTree(new_root).write(
            output,
            encoding='utf-8',
            xml_declaration=True
        )
        print(f"Exporté : {output}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Extraction de groupes COLLADA"
    )
    parser.add_argument('filename')
    parser.add_argument(
        '--fusion',
        action='store_true',
        help="Fusionner les groupes dans un nouvel objet"
    )
    args = parser.parse_args()
    if args.fusion:
        result = get_source_root_scene_sketchup(args.filename)
        if result is not None:
            source, root, visual_scene, _ = result
            export_fusion(source, root, visual_scene)
    else:
        extract_groups(args.filename)
