"""remove collada texture"""
import xml.etree.ElementTree as ET
from pathlib import Path
import sys

def remove_textures(filename):
    """remove textures"""

    source = Path(filename)

    if not source.exists():
        print(f"Fichier introuvable : {source}")
        return

    tree = ET.parse(source)
    root = tree.getroot()
    # Préserver le namespace COLLADA par défaut
    namespace = root.tag.split('}')[0].strip('{')
    ET.register_namespace('', namespace)

    # Namespace COLLADA
    ns = {'c': 'http://www.collada.org/2005/11/COLLADASchema'}

    # Suppression des images
    for images in root.findall('c:library_images', ns):
        root.remove(images)

    # Suppression des textures dans les effets
    for parent in root.iter():
        for child in list(parent):
            if child.tag.endswith('}texture'):
                parent.remove(child)

    # Nom du fichier de sortie
    output = source.with_name(
        f"{source.stem}-notexture.dae"
    )

    tree.write(
        output,
        encoding='utf-8',
        xml_declaration=True
    )

    print(f"Fichier créé : {output}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage : python dae_notexture.py fichier.dae")
    else:
        remove_textures(sys.argv[1])
