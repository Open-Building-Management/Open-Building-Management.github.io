"""dae exploration tools"""
import xml.etree.ElementTree as ET


def local_tag(element):
    """return local tag"""
    return element.tag.split('}')[-1]


def print_tree(element, level=0):
    """print a tree"""
    tag = local_tag(element)
    name = element.get('name') or element.get('id')
    indent = '  ' * level
    if tag == 'node':
        print(f"{indent}{name}")
    elif tag == 'instance_geometry':
        print(f"{indent}Geometry : {element.get('url')}")
    for child in element:
        print_tree(child, level + 1)


def explore_dae(filename):
    """explore a dae file"""
    tree = ET.parse(filename)
    root = tree.getroot()
    for vs in root.findall('.//{*}visual_scene'):
        print(ET.tostring(vs, encoding='unicode')[:3000])
    for visual_scene in root.iter():
        if local_tag(visual_scene) == 'visual_scene':
            print(f"\nScene : {visual_scene.get('id')}")
            print_tree(visual_scene)

if __name__ == '__main__':
    explore_dae('v3v.dae')
