import xmldoc from 'xmldoc';
import { SharedMap } from '@fluidframework/map';
import { SharedObjectSequence } from '@fluidframework/sequence';

export async function xmlStringToDdsSharedMap(
  runtime: any,
  xml: string,
  map: SharedMap
): Promise<boolean> {
  const doc = xmlToDoc(xml, true);
  if (!doc) {
    return false;
  }

  return xmlNodeToSharedMap(runtime, doc, map);
}

export function removeWhitespaces(xml: string): string {
  try {
    let doc = new xmldoc.XmlDocument(xml);
    const str = doc.toString({ compressed: true });
    return str;
  } catch (e) {
    console.error(`Failed to remove whitespaces in xml: ${e?.message || e}`);
    return '';
  }
}

function xmlToDoc(xml: string, removeWhitespaces?: boolean): any {
  try {
    let doc = new xmldoc.XmlDocument(xml);

    if (removeWhitespaces) {
      const str = doc.toString({ compressed: true });
      doc = new xmldoc.XmlDocument(str);
    }

    return doc;
  } catch (e) {
    console.error(`Failed to convert xml to doc: ${e?.message || e}`);
    return null;
  }
}

export async function xmlNodeToSharedMap(
  runtime: any /*IFluidDataStoreRuntime*/,
  elem: xmldoc.XmlNode,
  elemProp: SharedMap
): Promise<boolean> {
  try {
    elemProp.set('_type', elem.type);

    if (elem.type !== 'element') {
      const val =
        elem.type === 'text'
          ? elem.text
          : elem.type === 'cdata'
          ? elem.cdata
          : elem.type === 'comment'
          ? elem.comment
          : undefined;
      elemProp.set('_value', val);
    } else {
      elemProp.set('_name', elem.name);

      // Attributes
      const attrMap = SharedMap.create(runtime);
      elemProp.set('_attributes', attrMap.handle);
      for (const prop in elem.attr) {
        attrMap.set(prop, elem.attr[prop]);
      }

      // Children
      if (elem.children.length > 0) {
        const seq = SharedObjectSequence.create(runtime);
        elemProp.set('_children', seq.handle);
        let i = 0;
        for (let i = 0; i < elem.children.length; ++i) {
          const child = elem.children[i];
          const childMap = SharedMap.create(runtime, undefined);
          seq.insert(i, [childMap.handle]);
          await xmlNodeToSharedMap(runtime, child, childMap);
        }
      }
    }
  } catch (e) {
    console.error(
      `Failed to convert xml node to property dds node: message: ${e?.message}, stack: ${e?.stack}`
    );
    return false;
  }

  return true;
}
