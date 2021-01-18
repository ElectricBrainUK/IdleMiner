import {IonItem, IonLabel, IonToggle} from '@ionic/react';
import React from 'react';
import './EB-Settings-Boolean-Input.css';

interface TextInputProps {
    label: string,
    placeholder: boolean,
    onChange: any
}

const EBSettingsBooleanInput: React.FC<TextInputProps> = (props) => {

    return (
        <IonItem class={"ion-no-padding"}>
            <IonLabel style={{maxWidth: "220px", width: "220px"}}>{props.label + ":"}</IonLabel>
            <IonToggle mode="ios" checked={props.placeholder} onIonChange={props.onChange}/>
        </IonItem>
    );
};

export default EBSettingsBooleanInput;
