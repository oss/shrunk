import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';

interface Props {
    // alias?: string;
}

export default function LinkHubViewer(props: Props) {
    const [title, setTitle] = useState('');
    const [links, setLinks] = useState([]);
    const [owners, setOwners] = useState([]);
  
    let { alias } = useParams<{alias: string}>();

    console.log(alias)

    useEffect(() => {
        fetch(`/api/v1/linkhub/${alias}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((data) => {
            console.log(data)
        })
    });

    return <div>
        If you are reading this, then you have sucessfully have created two entry points.
    </div>
}