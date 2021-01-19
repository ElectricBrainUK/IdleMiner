import {IonInput, IonItem, IonLabel} from '@ionic/react';
import React from 'react';

interface NumInputProps {
    label: string,
    placeholder: string,
    onChange: any,
    unit?: string,
    min?: string,
    max?: string
}

const EBSettingsNumInput: React.FC<NumInputProps> = (props) => {

    return (
        <IonItem lines="none" class={"ion-no-padding"}>
            <IonLabel style={{maxWidth: "220px", width: "220px"}}>{props.label + ":"}</IonLabel>
            <IonItem style={{flexGrow: 1}} class={"ion-no-padding"}>
                <IonInput min={props.min} max={props.max} className="ion-text-wrap"
                          style={{paddingLeft: "20px", maxWidth: "100px", width: "100px"}}
                          placeholder={props.placeholder} type={"number"} onIonChange={props.onChange}/>
                <IonLabel style={{paddingLeft: "20px", maxWidth: "220px", width: "220px"}}>{props.unit}</IonLabel>
            </IonItem>
        </IonItem>
    );
};

export default EBSettingsNumInput;
