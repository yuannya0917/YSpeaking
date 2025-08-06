import React, { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Upload } from 'antd';
import styles from './ChattingUpload.module.css';

const { Dragger } = Upload;

export const ChattingUpload: React.FC = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const props: UploadProps = {
    name: 'file',
    multiple: true,
    action: 'https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload',
    beforeUpload:(file)=>{
      setFileList(prev=>[...prev, file]);
      return false; // 阻止自动上传
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
    showUploadList: false,
  };

  return (
    <div className={styles.chattingUpload}>
      <div className={styles.chattingUploadDragger}>
        <Dragger
          {...props}
        >
          <div className={styles.chattingUploadDraggerContent}>
            <InboxOutlined ></InboxOutlined>
            <p>点击上传文件或将音频文件拖拽至此处</p>
          </div>
        </Dragger>
      </div>

      <div >
        <ul className={styles.chattingUploadFileList}>
          {fileList.map((file) => (
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

export default ChattingUpload;