import { ChangeEvent, useRef, useState, DragEvent } from "react";
import type { Helia } from "helia";
import { unixfs } from "@helia/unixfs";

interface Props {
  helia: Helia;
  onAdded: (
    entries: {
      id: string;
      cid: string;
      name: string;
      size?: number;
      mime?: string;
    }[],
  ) => void;
}

export default function FilePicker({ helia, onAdded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setIsUploading(true);
    
    const fs = unixfs(helia);
    const results: {
      id: string;
      cid: string;
      name: string;
      size?: number;
      mime?: string;
    }[] = [];

    try {
      // Add files individually to get proper CIDs
      for (const file of Array.from(files)) {
        // Convert file to Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Add the file content directly
        const cid = await fs.addBytes(uint8Array);
        
        const cidStr = cid.toString();
        results.push({
          id: cidStr,             // CRDT-friendly: use CID as stable ID
          cid: cidStr,
          name: file.name,
          size: file.size,
          mime: file.type || undefined,
        });
      }

      onAdded(results);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      await handleFiles(e.target.files);
      e.currentTarget.value = ""; // reset the input
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      await handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*,image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      
      {isUploading ? (
        <div className="text-gray-600">
          <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-2"></div>
          <p>Uploading...</p>
        </div>
      ) : (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary mb-3"
          >
            Add pics
          </button>
          <p className="text-sm text-gray-500">
            or drag and drop files here
          </p>
        </>
      )}
    </div>
  );
}
