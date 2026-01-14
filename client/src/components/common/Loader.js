import React from 'react';

export default function Loader({ size='medium' }) {
  const style = { fontSize: size==='small'? '1em':'2em', textAlign:'center' };
  return <div style={style}>⏳ Loading…</div>;
}
