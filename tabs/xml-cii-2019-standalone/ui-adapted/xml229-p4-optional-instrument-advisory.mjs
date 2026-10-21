// Advisory only. Never delays Weight Match, approves kg or mutates source geometry.
export async function renderXml229InstrumentSuggestions(root,session,isCurrent){
 let advice=null;
 try{advice=await session?.readInstrumentModelingSuggestions?.();}
 catch{return;} // Optional suggestions must never prevent Weight Match.
 if(!isCurrent()||!root?.isConnected)return;
 root.querySelector('[data-p4-instrument-advisory]')?.remove();
 if(!advice?.items?.length)return;
 const note=root.ownerDocument.createElement('p');
 note.dataset.p4InstrumentAdvisory='true';
 note.textContent=advice.items.length+
  ' instrument modeling suggestions (optional; no approval required). '+
  'No rigid classification or kg was applied automatically.';
 root.insertBefore(note,root.firstChild);
}
