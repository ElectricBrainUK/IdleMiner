import {IonPage} from '@ionic/react';
import React from 'react';
import MiningPage from '../components/MiningPage';
import EBHeader from "../components/EB-Header";

const Settings: React.FC = () => {
    return (
        <IonPage>
            <EBHeader mainTitle={"Mine"} secondaryTitles={["Dashboard", "Settings"]}/>
            <MiningPage/>
        </IonPage>
    );
};

export default Settings;
