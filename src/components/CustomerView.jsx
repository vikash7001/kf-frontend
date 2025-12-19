import React, {useState} from 'react';
import StockView from './StockView';
import ImageViewer from './ImageViewer';

export default function CustomerView({user}){
  const [screen, setScreen] = useState('stock'); // stock, images

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <button onClick={()=>setScreen('stock')}>Available Stock</button>
        <button onClick={()=>setScreen('images')}>Images</button>
      </div>

      {screen === 'stock' && <StockView user={user} />}
      {screen === 'images' && <ImageViewer />}
    </div>
  );
}
