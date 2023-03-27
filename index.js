const express = require('express');
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const { toFHIRResource, toHL7, mergePatientRecources } = require('./helper');
const { log } = require('console');

const app = express();

const PORT = process.env.PORT || 3000
const baseURL = process.env.BaseURL || 'http://hapi.fhir.org/baseR4';

// TODO INPUT: Read the input patient JSON file
const inputPatient = JSON.parse(fs.readFileSync('./inputs/JsonPatientFile.json'));

// for test purpose 
let sourceId;

app.post('/create', async (req, res) => {
    try {
        // Convert the input patient JSON to FHIR resource
        const fhirPatient = toFHIRResource(inputPatient);
        console.log('FHIR patient resource:', fhirPatient);
        // Create the FHIR resource axios
        let response
        await axios.post(`${baseURL}/Patient`, fhirPatient).then(({data}) => {
            response = data
        }).catch(err => {
            return res.status(400).send(err);
        });
        console.log('Created patient:', response);
        // Generate the HL7 patient file for creation
        const hl7PatientCreation = toHL7(response);
        console.log('HL7 patient file for creation:', hl7PatientCreation);
        fs.writeFileSync('./outputs/HL7PatientFileCreation.hl7', hl7PatientCreation);

        // Save the sourceId for merge operation | TEST PURPOSE
        sourceId = response.id;

        res.status(201).send({message: 'Patient created successfully', data: response});
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating patient');
    }
});

//! NOT WORKING
// This merge endpoint isn't working, because I couldn't find a test server that supports patient merge operation
app.post('/merge-v1', async (req, res) => {
    try {
        const mergePatientParams = mergePatientRecources(req.body.target, req.body.candidate);
        console.log('Merge patient params:', mergePatientParams);
        let response;
        await axios.post(`${baseURL}/Patient/$merge
        `, mergePatientParams)
        .then(({data}) => {
            response = data
            console.log('Patient merged successfully:', data);
        })
        .catch((error) => {
            console.error('Error merging patients:', error.response?.data);
        });

        // Generate the HL7 patient file for merge
        const hl7PatientMerge = toHL7(response);
        console.log('HL7 patient file for merge:', hl7PatientMerge);
        fs.writeFileSync('./outputs/HL7PatientFileMerge.hl7', hl7PatientMerge);
        res.status(200).send('Patient merged successfully', response);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error merging patient');
    }
});

// TODO INPUT: Read the input patient JSON file
const updatePatientData = JSON.parse(fs.readFileSync('./inputs/updatedPatientFile.json'));


// This is another implementation for patient merge which is manually by fetching petient resource and updating it
app.post('/merge', async (req, res) => {
    try {
        // Retrieve the patient resources from the FHIR server
        const sourcePatient = await axios.get(`http://hapi.fhir.org/baseR4/Patient/${sourceId}`);
        const targetPatient = await toFHIRResource(updatePatientData);
        console.log("FILE ====> ", updatePatientData);
        console.log('Source patient resource:', sourcePatient.data);
        console.log('Target patient resource:', targetPatient);
    
        // Create a new patient resource that represents the merged patient
        const mergedPatient = {
            resourceType: 'Patient',
            ...sourcePatient.data,
            ...targetPatient,
        };
        console.log('Merged patient resource:', mergedPatient);
    
        // Create the merged patient resource in the FHIR server
        const response = await axios.post('http://hapi.fhir.org/baseR4/Patient', mergedPatient);
        
        // store after converting to HL7 in HL7PatientFileMerge.hl7
        const hl7PatientMerge = toHL7(response.data);
        fs.writeFileSync('./outputs/HL7PatientFileMerge.hl7', hl7PatientMerge);

        // Delete the original patient resources | Before update
        await axios.delete(`http://hapi.fhir.org/baseR4/Patient/${sourceId}`);
    
        // Return the merged patient resource as the response
        res.status(200).send(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to merge patients.' });
    }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
