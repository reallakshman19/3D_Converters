import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function installXmlDomShim() {
  class SimpleElement {
    constructor(name) {
      this.nodeType = 1;
      this.nodeName = name;
      this.localName = name;
      this.childNodes = [];
      this.parentNode = null;
      this.namespaceURI = '';
      this._textContent = '';
    }
    appendChild(child) {
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }
    get textContent() {
      if (this.childNodes.length) return this.childNodes.map((child) => child.textContent).join('');
      return this._textContent;
    }
    set textContent(value) {
      this.childNodes = [];
      this._textContent = String(value ?? '');
    }
    getElementsByTagName(name) {
      const out = [];
      const visit = (node) => {
        for (const child of node.childNodes || []) {
          if (child.nodeType === 1) {
            if (child.localName === name) out.push(child);
            visit(child);
          }
        }
      };
      visit(this);
      return out;
    }
  }

  function parseElement(xml, cursor = { index: 0 }) {
    const open = xml.slice(cursor.index).match(/^<([A-Za-z0-9_:-]+)(?:\s[^>]*)?>/);
    if (!open) throw new Error(`Expected element at ${cursor.index}`);
    const node = new SimpleElement(open[1].replace(/^.*:/, ''));
    cursor.index += open[0].length;
    while (cursor.index < xml.length) {
      if (xml.startsWith(`</${open[1]}>`, cursor.index)) {
        cursor.index += open[1].length + 3;
        return node;
      }
      if (xml.startsWith('<', cursor.index)) {
        if (xml.startsWith('<?', cursor.index)) {
          const end = xml.indexOf('?>', cursor.index);
          cursor.index = end < 0 ? xml.length : end + 2;
          continue;
        }
        if (xml.startsWith('<!--', cursor.index)) {
          const end = xml.indexOf('-->', cursor.index);
          cursor.index = end < 0 ? xml.length : end + 3;
          continue;
        }
        const self = xml.slice(cursor.index).match(/^<([A-Za-z0-9_:-]+)(?:\s[^>]*)?\/>/);
        if (self) {
          node.appendChild(new SimpleElement(self[1].replace(/^.*:/, '')));
          cursor.index += self[0].length;
          continue;
        }
        node.appendChild(parseElement(xml, cursor));
        continue;
      }
      const next = xml.indexOf('<', cursor.index);
      node._textContent += xml.slice(cursor.index, next < 0 ? xml.length : next);
      cursor.index = next < 0 ? xml.length : next;
    }
    return node;
  }

  class DOMParserShim {
    parseFromString(xml) {
      const source = String(xml).replace(/^\s*<\?xml[^>]*>\s*/i, '');
      const root = parseElement(source, { index: 0 });
      root.getElementsByTagName = SimpleElement.prototype.getElementsByTagName;
      return root;
    }
  }

  function serialize(node) {
    const body = node.childNodes.length ? node.childNodes.map(serialize).join('') : node._textContent;
    return `<${node.nodeName}>${body}</${node.nodeName}>`;
  }

  class XMLSerializerShim {
    serializeToString(document) {
      return serialize(document);
    }
  }

  globalThis.DOMParser = DOMParserShim;
  globalThis.XMLSerializer = XMLSerializerShim;
}

function loadShortDropContinuity() {
  installXmlDomShim();
  const sourcePath = resolve('converters/xml-cii2019-core/short-drop-continuity.js');
  let source = readFileSync(sourcePath, 'utf8');
  source = source.replace(/export function applyXmlCiiShortDropContinuity/, 'function applyXmlCiiShortDropContinuity');
  return Function(`${source}\nreturn { applyXmlCiiShortDropContinuity };`)();
}

function node({ number, type = 'PIPE', connection = '', position = '0 0 0' }) {
  return `<Node><NodeNumber>${number}</NodeNumber><Endpoint>0</Endpoint><ComponentType>${type}</ComponentType><ConnectionType>${connection}</ConnectionType><Position>${position}</Position></Node>`;
}

function tag(block, name) {
  return String(block).match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]?.trim() || '';
}

test('terminal short-pruned positive TEE preserves junction node number in previous kept node', () => {
  const { applyXmlCiiShortDropContinuity } = loadShortDropContinuity();
  const xml = `<PipeStressExport><Pipe><Branch><Branchname>/TEST/TEE</Branchname>
${node({ number: 477, type: 'PIPE', position: '0 0 0' })}
${node({ number: 479, type: 'PIPE', position: '100 0 0' })}
${node({ number: 480, type: 'TEE', position: '103 0 0' })}
</Branch></Pipe></PipeStressExport>`;
  const result = applyXmlCiiShortDropContinuity(xml, { shortElementLengthDropThresholdMm: 6 });
  assert.equal(result.appliedCount, 1);
  assert.match(result.xmlText, /<NodeNumber>480<\/NodeNumber><Endpoint>0<\/Endpoint><ComponentType>PIPE<\/ComponentType>/);
  assert.equal(result.diagnostics[0].droppedComponentType, 'TEE');
});

test('terminal short-pruned positive OLET preserves junction node number in previous kept node', () => {
  const { applyXmlCiiShortDropContinuity } = loadShortDropContinuity();
  const xml = `<PipeStressExport><Pipe><Branch><Branchname>/TEST/OLET</Branchname>
${node({ number: 477, type: 'PIPE', position: '0 0 0' })}
${node({ number: 479, type: 'PIPE', position: '100 0 0' })}
${node({ number: 480, type: 'OLET', position: '103 0 0' })}
</Branch></Pipe></PipeStressExport>`;
  const result = applyXmlCiiShortDropContinuity(xml, { shortElementLengthDropThresholdMm: 6 });
  assert.equal(result.appliedCount, 1);
  assert.equal(result.diagnostics[0].droppedComponentType, 'OLET');
});

test('terminal short-pruned connection type TEE preserves junction node number', () => {
  const { applyXmlCiiShortDropContinuity } = loadShortDropContinuity();
  const xml = `<PipeStressExport><Pipe><Branch><Branchname>/TEST/CONNECTION-TEE</Branchname>
${node({ number: 477, type: 'PIPE', position: '0 0 0' })}
${node({ number: 479, type: 'PIPE', position: '100 0 0' })}
${node({ number: 480, type: 'BRAN', connection: 'TEE', position: '103 0 0' })}
</Branch></Pipe></PipeStressExport>`;
  const result = applyXmlCiiShortDropContinuity(xml, { shortElementLengthDropThresholdMm: 6 });
  assert.equal(result.appliedCount, 1);
  assert.equal(result.diagnostics[0].droppedConnectionType, 'TEE');
});
