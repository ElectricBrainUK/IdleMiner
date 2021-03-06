import {IonInput, IonItem, IonLabel, IonToggle} from '@ionic/react';
import React from 'react';

interface TextInputProps {
    label: string,
    placeholderNum?: string,
    onChangeNum: any,
    unit?: string,
    default?: boolean,
    onChangeBool: any,
    min?: string,
    max?: string
}

const EBSettingsSupportUs: React.FC<TextInputProps> = (props) => {

    return (
        <IonItem lines="none" class={"ion-no-padding"}>
            <IonLabel className="ion-text-wrap" style={{maxWidth: "220px", minWidth: "220px"}}>{props.label + ":"}</IonLabel>
            <IonItem style={{flexGrow: 1}} class={"ion-no-padding"}>
                <IonToggle style={{flexShrink: 0}} mode="ios" checked={props.default} onIonChange={props.onChangeBool}/>
                <IonInput min={props.min} max={props.max} className="ion-text-wrap"
                          style={{paddingLeft: "20px", maxWidth: "100px", minWidth: "100px"}}
                          placeholder={props.placeholderNum} type={"number"} onIonChange={props.onChangeNum}/>
                <IonLabel style={{paddingLeft: "20px", flexShrink: 0}}>{props.unit}</IonLabel>
            </IonItem>
        </IonItem>
    );
};

EBSettingsSupportUs.defaultProps = {
    min: "0",
    max: "100",
    unit: "%"
}

export default EBSettingsSupportUs;
