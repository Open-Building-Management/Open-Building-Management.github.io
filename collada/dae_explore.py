"""Outils d'exploration de l'arborescence COLLADA."""

import argparse
import xml.etree.ElementTree as ET


def local_tag(element):
    """Retourne le nom local d'une balise XML, sans son namespace."""
    return element.tag.split('}')[-1]


def child_nodes(element):
    """Retourne les nodes descendants immédiats, en traversant les balises intermédiaires."""
    for child in element:
        if local_tag(child) == 'node':
            yield child
        else:
            yield from child_nodes(child)


def count_direct_geometries(node):
    """Compte les géométries rattachées au node, sans celles de ses sous-nodes."""
    count = 0

    def visit(element):
        nonlocal count
        for child in element:
            tag = local_tag(child)
            if tag == 'node':
                continue
            if tag == 'instance_geometry':
                count += 1
            visit(child)

    visit(node)
    return count


def count_nodes(node):
    """Compte le node et tous ses descendants."""
    return 1 + sum(count_nodes(child) for child in child_nodes(node))


def max_node_depth(node):
    """Retourne la profondeur maximale sous ce node (node courant inclus)."""
    depths = [max_node_depth(child) for child in child_nodes(node)]
    return 1 + max(depths, default=0)


def print_node_tree(node, level=0):
    """Affiche les nodes avec les compteurs de géométrie directe et totale."""
    name = node.get('name') or node.get('id') or '<sans nom>'
    direct_geometries = count_direct_geometries(node)
    total_geometries = sum(
        1 for element in node.iter()
        if local_tag(element) == 'instance_geometry'
    )
    descendants = count_nodes(node) - 1
    indent = '  ' * level

    print(
        f"{indent}{name} "
        f"[nodes descendants : {descendants}, "
        f"géométries directes : {direct_geometries}, "
        f"géométries totales : {total_geometries}]"
    )

    for child in child_nodes(node):
        print_node_tree(child, level + 1)


def explore_dae(filename):
    """Affiche l'arborescence des visual_scene et un bilan pour chacune."""
    root = ET.parse(filename).getroot()
    visual_scenes = [
        element for element in root.iter()
        if local_tag(element) == 'visual_scene'
    ]

    if not visual_scenes:
        print("Aucune visual_scene trouvée.")
        return

    for visual_scene in visual_scenes:
        scene_nodes = list(child_nodes(visual_scene))
        node_count = sum(count_nodes(node) for node in scene_nodes)
        geometry_count = sum(
            1 for element in visual_scene.iter()
            if local_tag(element) == 'instance_geometry'
        )
        max_depth = max(
            (max_node_depth(node) for node in scene_nodes),
            default=0
        )

        print(f"\nScene : {visual_scene.get('id') or '<sans identifiant>'}")
        for node in scene_nodes:
            print_node_tree(node)

        print(
            "\nBilan : "
            f"{node_count} node(s), "
            f"{geometry_count} géométrie(s), "
            f"profondeur maximale : {max_depth}"
        )


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Exploration d'un fichier COLLADA")
    parser.add_argument('filename', nargs='?', default='v3v.dae')
    args = parser.parse_args()
    explore_dae(args.filename)
