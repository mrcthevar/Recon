import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES } from '../constants';
import { FileData } from '../types';

interface FileUploaderProps {
  onFileSelect: (fileData: FileData) => void;
  selectedFile: FileData | null;
  onClear: () => void;
  disabled: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, selectedFile, onClear, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;
    
    // Check type roughly
    if (!file.type.startsWith('image/')) {
        alert("System currently optimized for Image Reconnaissance.");
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      onFileSelect({
        file,
        previewUrl: result,
        base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer 
            border-2 border-dashed rounded-lg p-12 
            transition-all duration-300 ease-in-out
            flex flex-col items-center justify-center
            ${isDragging 
              ? 'border-accent bg-accent-dim' 
              : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900/50 hover:bg-neutral-800/20'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept={ACCEPTED_IMAGE_TYPES}
            className="hidden"
            disabled={disabled}
          />
          
          <div className={`p-4 rounded-full bg-neutral-800 mb-4 group-hover:scale-110 transition-transform ${isDragging ? 'text-accent' : 'text-neutral-400'}`}>
            <Upload className="w-8 h-8" />
          </div>
          
          <h3 className="text-lg font-mono font-medium text-neutral-300 mb-1">
            Drop Intelligence Here
          </h3>
          <p className="text-xs text-neutral-500 font-mono">
            SUPPORTED: PNG, JPG, WEBP
          </p>
          
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neutral-700 group-hover:border-accent transition-colors"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neutral-700 group-hover:border-accent transition-colors"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neutral-700 group-hover:border-accent transition-colors"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neutral-700 group-hover:border-accent transition-colors"></div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 group">
          <img 
            src={selectedFile.previewUrl} 
            alt="Preview" 
            className="w-full h-64 md:h-96 object-contain bg-black/50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
             <div className="flex justify-between items-end">
                <div className="font-mono text-xs text-accent">
                    <p>FILE: {selectedFile.file.name}</p>
                    <p>SIZE: {(selectedFile.file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    disabled={disabled}
                    className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full border border-red-500/50 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
             </div>
          </div>
          
          {/* Overlay grid for "tactical" look */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(20,184,166,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        </div>
      )}
    </div>
  );
};