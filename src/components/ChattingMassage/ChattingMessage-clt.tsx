import React from "react";
import { Button } from "antd";
export const ChattingMessage: React.FC = () => {
  return (
    <div>
        Chatting Message
        <Button type="primary">Copy</Button>
        <Button type="primary">Delete</Button>
    </div>
    );
};

export default ChattingMessage;
