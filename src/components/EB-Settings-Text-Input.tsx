import {IonInput, IonItem, IonLabel} from '@ionic/react';
import React from 'react';

interface TextInputProps {
    label: string,
    placeholder?: string,
    onChange: any,
    type?: any
}

const EBSettingsTextInput: React.FC<TextInputProps> = (props) => {

    return (
        <IonItem class={"ion-no-padding"}>
            <IonLabel className="ion-text-wrap" style={{maxWidth: "220px", width: "220px"}}>{props.label + ":"}</IonLabel>
            <IonInput placeholder={props.placeholder} type={props.type} onIonChange={props.onChange}/>
        </IonItem>
    );
};

EBSettingsTextInput.defaultProps = {
    type: "text"
}

export default EBSettingsTextInput;
