import React from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload } from 'antd';
import styles from './ChattingUpload.module.css'; 

const { Dragger } = Upload;

const props: UploadProps = {
  name: 'file',
  multiple: true,
  action: 'https://660d2bd96ddfa2943b33731c.mockapi.io/api/upload',
  onChange(info) {
    const { status } = info.file;
    if (status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (status === 'done') {
      message.success(`${info.file.name} file uploaded successfully.`);
    } else if (status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  },
  onDrop(e) {
    console.log('Dropped files', e.dataTransfer.files);
  },
};

export const ChattingUpload: React.FC = () => (
  <div className={styles.chattingUpload}>
    <Dragger {...props}>
    <div className={styles.draggerContent}>
      <InboxOutlined ></InboxOutlined>
      <p>点击上传文件或将音频文件拖拽至此处</p>
    </div>
  </Dragger>
  </div>
  
);

export default ChattingUpload;