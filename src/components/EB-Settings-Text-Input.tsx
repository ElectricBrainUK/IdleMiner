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
        <IonItem lines="none" class={"ion-no-padding"}>
            <IonLabel className="ion-text-wrap" style={{maxWidth: "220px", width: "220px"}}>{props.label + ":"}</IonLabel>
            <IonItem style={{flexGrow: 1}} class={"ion-no-padding"}>
                <IonInput placeholder={props.placeholder} type={props.type} onIonChange={props.onChange}/>
            </IonItem>
        </IonItem>
    );
};

EBSettingsTextInput.defaultProps = {
    type: "text"
}

export default EBSettingsTextInput;
