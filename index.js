const express = require('express');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, child, get, update } = require('firebase/database');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');


dotenv.config();

const firebaseConfig = {
    apiKey: process.env.REACT_APP_AIRTABLE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Create an instance of an Express app
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Define a route
app.get('/get-data', (req, res) => {

    let images = [];
    let test_stimuli = [];

    async function processCountData() {
        const dbRef = ref(database);
        try {
            const snapshot = await get(child(dbRef, 'count'));
            if (snapshot.exists()) {
                const countData = snapshot.val();

                function lowestValueAndKey(obj) {
                    let [lowestItems] = Object.entries(obj).sort(([ ,v1], [ ,v2]) => v1 - v2);
                    return lowestItems[0];
                }

                const key = lowestValueAndKey(countData)

                const updates = {};
                updates[`count/${key}`] = countData[key] + 1
                await update(dbRef,updates)

                return key

            } else {
                console.log("No count data available");
                return null;
            }
        } catch (error) {
            console.error("Error processing count data:", error);
        }
    }

    const setTable = processCountData()
    let tableAirtable;

    switch (setTable) {
        case "table_one":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_1
            break;
        case "table_two":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_2
            break;
        case "table_three":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_3
            break;
        case "table_four":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_4
            break;
        case "table_five":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_5
            break;
        case "table_six":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_6
            break;
        case "table_seven":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_7
            break;
        case "table_eight":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_8
            break;
        case "table_nine":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_9
            break;
        case "table_ten":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_10
            break;
        case "table_eleventh":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_11
            break;
        case "table_twelfth":
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_12
            break;
        default:
            tableAirtable = process.env.REACT_APP_AIRTABLE_ALIVE_TABLE_1
    }

    let Airtable = async (base, table) => {

        const url = `https://api.airtable.com/v0/${base}/${table}`;
        let allRecords = [];
        let offset = null;

        try {
            do {
                // Construct the URL with the offset if available
                let fetchUrl = url;
                if (offset) {
                    fetchUrl += `?offset=${offset}`;
                }

                const response = await fetch(fetchUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.REACT_APP_AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();

                // Concatenate the current batch of records with the previous ones
                allRecords = allRecords.concat(result.records);

                // Set the offset for the next request, if available
                offset = result.offset;

            } while (offset);  // Keep looping until there's no more offset

            return allRecords;  // Return all the records after fetching

        } catch (error) {
            console.log('Could not fetch data from Airtable.', error);
            return [];
        }
    }

    const data = Airtable(process.env.REACT_APP_AIRTABLE_ALIVE_BASE, tableAirtable)

    data.then((result) =>{
        for(let rows in result){
            let temp_data = result[rows].fields
            let image_name;
            switch(temp_data['bucket'].split('/')[1]){
                case "":
                    image_name = process.env.REACT_APP_AWS_BUCKET_LINK + "/" + temp_data['item']
                    break;
                case "Study2+resized+for+online":
                    image_name = process.env.REACT_APP_AWS_BUCKET_TWO_LINK + "/" + temp_data['item']
                    break;
                default:
                    image_name = process.env.REACT_APP_AWS_BUCKET_LINK + "/" + temp_data['item']
            }
            images.push(image_name)
            temp_data['url'] = image_name
            test_stimuli.push(result[rows].fields)
        }
        images.push(process.env.REACT_APP_AWS_BUCKET_LINK + "mask1.jpg")
    }).then((dataset) =>{
        res.status(200).json({
            test_stimuli: test_stimuli,
            images: images
        })
    })
});

app.post('/submit-results', (req, res) => {
    const results = req.body; // Get results from the request body
    console.log('Received results:', results); // Log results to the console

    // Here you can process or save the results as needed
    // For now, just send a success response
    res.status(200).json({ message: 'Results received successfully!' });
});

// Set the app to listen on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});