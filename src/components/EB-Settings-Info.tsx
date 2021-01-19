import {IonInput, IonItem, IonLabel} from '@ionic/react';
import React from 'react';

interface InfoProps {
    label: string
}

const EBSettingsInfo: React.FC<InfoProps> = (props) => {

    return (
        <IonItem class={"ion-no-padding"}>
            <IonLabel className="ion-text-wrap" style={{width: "100%"}}>{props.label}</IonLabel>
        </IonItem>
    );
};

export default EBSettingsInfo;
