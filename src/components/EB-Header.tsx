import {IonHeader, IonLabel, IonToolbar} from '@ionic/react';
import React from 'react';
import './EB-Header.css';

interface HeaderProps {
    mainTitle: string,
    secondaryTitles: string[],
    selected?: number,
    onClick: any
}

const EBHeader: React.FC<HeaderProps> = (props) => {
    const options: any = [];

    props.secondaryTitles.forEach((title: string, i: number) => {
        options.push(
            <IonLabel onClick={() => props.onClick(i)} key={title}
                      className={"eb-title" + (i === props.selected ? " eb-bold" : "")}>{title}</IonLabel>
        );
    });

    return (
        <IonHeader>
            <IonToolbar class="toolbar">
                <IonLabel class="eb-title eb-bold regular-cursor">{props.mainTitle}</IonLabel>
                <div className="eb-header-divider"/>
                {options}
            </IonToolbar>
        </IonHeader>
    );
};

EBHeader.defaultProps = {
    selected: 0
}

export default EBHeader;
