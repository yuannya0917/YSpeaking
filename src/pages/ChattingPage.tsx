import React from 'react'
import {ChattingInput} from '../components/ChattingInout/ChattingInput.tsx'
import {ChattingUpload} from '../components/ChattingUpload/ChattingUpload.tsx'
import {ChattingMessage} from '../components/ChattingMassage/ChattingMessage-clt.tsx'
const ChattingPage:React.FC=()=>{
    return (

        <div>
            {/* <ChattingMessage></ChattingMessage> */}
            <div>-----------------------------------------------------------------</div>
            <div>
                <div >
                    <ChattingUpload/>
                </div>
                <div>
                    <ChattingInput/>
                </div>
                
            </div>
            
            <div></div>
            
        </div>
    )
}

export default ChattingPage