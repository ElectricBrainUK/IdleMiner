import {IonButton, IonInput, IonItem, IonLabel} from '@ionic/react';
import React from 'react';
import {Simulate} from "react-dom/test-utils";

interface TextInputProps {
    label: string,
    placeholder1?: string,
    onChange1: any,
    type1?: any
    placeholder2?: string,
    onChange2: any,
    type2?: any,
    submit: any,
    submitText?: string
}

const EBSettingsDoubleTextInput: React.FC<TextInputProps> = (props) => {

    return (
        <IonItem lines="none" class={"ion-no-padding"}>
            <IonLabel className="ion-text-wrap" style={{maxWidth: "220px", width: "220px", flexShrink: 0}}>{props.label + ":"}</IonLabel>
            <IonItem style={{flexGrow: 1}} class={"ion-no-padding"}>
                <IonInput placeholder={props.placeholder1} type={props.type1} onIonChange={props.onChange1}/>
                <IonInput placeholder={props.placeholder2} type={props.type2} onIonChange={props.onChange2}/>
                <IonButton style={{fontSize: "16px"}} onClick={props.submit}>{props.submitText}</IonButton>
            </IonItem>
        </IonItem>
    );
};

EBSettingsDoubleTextInput.defaultProps = {
    type1: "text",
    type2: "text",
    submitText: "Add"
}

export default EBSettingsDoubleTextInput;
