import {IonInput, IonItem, IonLabel} from '@ionic/react';
import React from 'react';

interface TextInputProps {
    label: string,
    placeholder: string,
    onChange: any
}

const EBSettingsTextInput: React.FC<TextInputProps> = (props) => {

    return (
        <IonItem class={"ion-no-padding"}>
            <IonLabel style={{maxWidth: "220px", width: "220px"}}>{props.label + ":"}</IonLabel>
            <IonInput placeholder={props.placeholder} type={"text"} onIonChange={props.onChange}/>
        </IonItem>
    );
};

export default EBSettingsTextInput;
