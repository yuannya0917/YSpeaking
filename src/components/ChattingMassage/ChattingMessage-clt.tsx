import React from "react";
import { Button } from "antd";
import styles from './ChattingMessage-clt.module.css';
import { CopyOutlined } from '@ant-design/icons';

interface cltChattingMessageProps {
  content: string;
}
export const ChattingMessage: React.FC<cltChattingMessageProps> = ({
   content 
  }) => {
  return (
    <div className={styles.cltChattingMessageWrapper}>
      <div className={styles.cltChattingMessage}>
        <div className={styles.cltChattingMessageContent}> {content} </div>
      </div>
      
      <div className={styles.cltChattingMessageActions}>
        <Button
          type="primary"
          size="small"
          shape="circle"
          className={styles.cltChattingMessageCopyButton}
        >
          <CopyOutlined />
        </Button>
      </div>

    </div>

  );
};

export default ChattingMessage;
