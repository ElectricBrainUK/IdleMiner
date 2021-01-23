import {IonItem, IonLabel, IonToggle} from '@ionic/react';
import React from 'react';

interface TextInputProps {
    label: string,
    default: boolean,
    onChange: any,
    secondaryLabel?: string
}

const EBSettingsBooleanInput: React.FC<TextInputProps> = (props) => {

    return (
        <IonItem lines="none" class={"ion-no-padding"}>
            <IonLabel className="ion-text-wrap" style={{maxWidth: "220px", minWidth: "220px", flexShrink: 0}}>{props.label + ":"}</IonLabel>
            <IonToggle mode="ios" checked={props.default} onIonChange={props.onChange}/>
            <IonLabel className="ion-text-wrap" style={{paddingLeft: "20px", flexGrow: 1}}>{props.secondaryLabel}</IonLabel>
        </IonItem>
    );
};

export default EBSettingsBooleanInput;
