import {IonInput, IonItem, IonLabel} from '@ionic/react';
import React from 'react';

interface NumInputProps {
    label: string,
    placeholder: string,
    onChange: any,
    unit: string
}

const EBSettingsNumInput: React.FC<NumInputProps> = (props) => {

    return (
        <IonItem class={"ion-no-padding"}>
            <IonLabel style={{maxWidth: "220px", width: "220px"}}>{props.label + ":"}</IonLabel>
            <IonInput style={{paddingLeft: "20px", maxWidth: "100px", width: "100px"}} placeholder={props.placeholder} type={"number"} onIonChange={props.onChange}/>
            <IonLabel style={{paddingLeft: "20px", maxWidth: "220px", width: "220px"}}>{props.unit}</IonLabel>
        </IonItem>
    );
};

export default EBSettingsNumInput;
