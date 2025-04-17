import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import styles from './SignaturePad.module.css';

const SignaturePad = ({ onSave }) => {
  const [signatureType, setSignatureType] = useState('draw'); // 'draw', 'type', or 'upload'
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [penSize, setPenSize] = useState(2);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [error, setError] = useState('');
  
  const signatureRef = useRef();
  const fileInputRef = useRef();

  const fonts = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Comic Sans MS'
  ];

  const colors = [
    '#000000',
    '#0000FF',
    '#FF0000',
    '#008000',
    '#800080'
  ];

  const handleClear = () => {
    if (signatureType === 'draw') {
      signatureRef.current.clear();
    } else if (signatureType === 'type') {
      setTypedSignature('');
    } else if (signatureType === 'upload') {
      setUploadedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setError('');
  };

  const handleSave = () => {
    try {
      let signatureData = null;

      if (signatureType === 'draw') {
        if (signatureRef.current.isEmpty()) {
          setError('Please draw a signature');
          return;
        }
        signatureData = signatureRef.current.toDataURL();
      } else if (signatureType === 'type') {
        if (!typedSignature.trim()) {
          setError('Please type a signature');
          return;
        }
        // Create a canvas to render the typed signature
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 200;
        
        ctx.font = `24px ${selectedFont}`;
        ctx.fillStyle = selectedColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);
        
        signatureData = canvas.toDataURL();
      } else if (signatureType === 'upload') {
        if (!uploadedImage) {
          setError('Please upload a signature image');
          return;
        }
        signatureData = uploadedImage;
      }

      if (signatureData) {
        onSave(signatureData);
        setError('');
      }
    } catch (err) {
      setError('Error saving signature: ' + err.message);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target.result);
          setError('');
        };
        reader.readAsDataURL(file);
      } else {
        setError('Please upload an image file');
        setUploadedImage(null);
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.signatureTypeSelector}>
        <button
          className={`${styles.typeButton} ${signatureType === 'draw' ? styles.active : ''}`}
          onClick={() => setSignatureType('draw')}
        >
          Draw
        </button>
        <button
          className={`${styles.typeButton} ${signatureType === 'type' ? styles.active : ''}`}
          onClick={() => setSignatureType('type')}
        >
          Type
        </button>
        <button
          className={`${styles.typeButton} ${signatureType === 'upload' ? styles.active : ''}`}
          onClick={() => setSignatureType('upload')}
        >
          Upload
        </button>
      </div>

      {signatureType === 'draw' && (
        <>
          <div className={styles.controls}>
            <div className={styles.colorPicker}>
              {colors.map((color) => (
                <div
                  key={color}
                  className={`${styles.colorOption} ${selectedColor === color ? styles.active : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
            <div className={styles.penSize}>
              <label>Pen Size:</label>
              <input
                type="range"
                min="1"
                max="5"
                value={penSize}
                onChange={(e) => setPenSize(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className={styles.canvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: styles.signatureCanvas,
                style: {
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }
              }}
              backgroundColor="white"
              penColor={selectedColor}
              minWidth={penSize}
              maxWidth={penSize}
            />
          </div>
        </>
      )}

      {signatureType === 'type' && (
        <>
          <select
            className={styles.fontSelector}
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
          >
            {fonts.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
          <div className={styles.colorPicker}>
            {colors.map((color) => (
              <div
                key={color}
                className={`${styles.colorOption} ${selectedColor === color ? styles.active : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <input
            type="text"
            className={styles.typedSignature}
            value={typedSignature}
            onChange={(e) => setTypedSignature(e.target.value)}
            placeholder="Type your signature"
            style={{ fontFamily: selectedFont, color: selectedColor }}
          />
        </>
      )}

      {signatureType === 'upload' && (
        <div className={styles.imageUpload}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
          />
          {uploadedImage && (
            <img
              src={uploadedImage}
              alt="Uploaded signature"
              className={styles.imagePreview}
            />
          )}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.clearButton}`} onClick={handleClear}>
          Clear
        </button>
        <button className={`${styles.button} ${styles.saveButton}`} onClick={handleSave}>
          Save Signature
        </button>
      </div>
    </div>
  );
};

export default SignaturePad; 