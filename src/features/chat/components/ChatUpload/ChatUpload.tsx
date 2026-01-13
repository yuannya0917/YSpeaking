import React, { useEffect, useState, useRef } from 'react';
import { InboxOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { RcFile } from 'antd/es/upload';
import styles from './ChatUpload.module.css';

interface ChatUploadProps {
  files: UploadFile[];
  onFilesChange: React.Dispatch<React.SetStateAction<UploadFile[]>>;
}

export const ChatUpload: React.FC<ChatUploadProps> = ({ files, onFilesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const appendFiles = (filesToAppend: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(filesToAppend).map((file) => ({
      uid: `local-${Date.now()}-${file.name}-${Math.random()}`,
      name: file.name,
      size: file.size,
      originFileObj: file as RcFile,
      status: 'done',
    }));
    onFilesChange((prev) => [...prev, ...newFiles]);
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files?.length) {
        appendFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragenter', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragenter', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <div className={styles.chattingUpload}>
      {isDragging && (
        <div className={styles.chattingUploadOverlay}>
          <div className={styles.chattingUploadOverlayContent}>
            <InboxOutlined />
            <span>将文件拖拽到任意位置即可添加</span>
          </div>
        </div>
      )}

      <div className={styles.chattingUploadToolbar}>
        <button
          type="button"
          className={styles.chattingUploadButton}
          onClick={() => inputRef.current?.click()}
        >
          <PaperClipOutlined />
          <span>选择文件</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className={styles.chattingUploadInput}
          onChange={(e) => {
            const selected = e.target.files;
            if (selected?.length) {
              appendFiles(selected);
            }
            e.target.value = '';
          }}
        />
      </div>

      <div>
        <ul className={styles.chattingUploadFileList}>
          {files.map((file) => (
            <li
              className={styles.chattingUploadFileItem}
              key={file.uid}>
                <span className={styles.chattingUploadFileName}>{file.name}</span>
                <span className={styles.chattingUploadFileSize}>
                  {file.size !== undefined ? `${(file.size / 1024).toFixed(2)} KB` : '未知大小'}
                </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ChatUpload;