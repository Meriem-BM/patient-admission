const helper = {
    // This function is used to get the patient id from the patient resource
    toFHIRResource: async (patientJson) => {
        try {
            const fhirPatient = {
                "resourceType": "Patient",
                "name": [
                    {
                        "use": "official",
                        "family": patientJson.lastName,
                        "given": [
                            patientJson.firstName
                        ]
                    }
                ],
                "gender": patientJson.gender,
                "birthDate": patientJson.birthDate,
                "address": [
                    {
                        "use": "home",
                        "line": [
                            patientJson.address
                        ],
                        "city": patientJson.city,
                        "postalCode": patientJson.postalCode
                    }
                ],
                "telecom": [
                    {
                        "system": "phone",
                        "value": patientJson.phoneNumber
                    }
                ]
            };
            console.log('FHIR patient resource:', fhirPatient);
            return fhirPatient;
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating patient');
        }
    },
    // This function is used to convert the patient resource to HL7
    toHL7: (patientJson) => {
        try {
        // Convert the FHIR resource to HL7
            const hl7Fhir = "MSH|^~\\&|TEST_HOSPITAL|TEST_DEPARTMENT|TEST_APPLICATION|TEST_FACILITY|202203271615||ADT^A01|1234567890|P|2.5.1|||\r" +
                "PID|||" + patientJson.id + "" + patientJson.id + "^^^MR||" + patientJson.name[0].family + "^" + patientJson.name[0].given[0] + "|||" + patientJson.gender + "||" + patientJson.birthDate + "||||||||||\r" +
                "PV1||I\r" +
                "ORC|NW|||1234567890^TEST_HOSPITAL||||||||||||||||||\r" +
                "TXA|1|||202203271615|||||||||||||||||||\r" +
                "FT1|1||||20220327||CG|1|||1234567890^TEST_HOSPITAL||";
                console.log('HL7 patient file:', hl7Fhir);
            return hl7Fhir  
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating patient');
        } 
    },
    mergePatientRecources: (targetPatientId, candidatPatientId) => {
        // Defines how the merge ressource should look like
        // I didn't implement all the fields listed on the patient schema
        try {
            const mergePatientParams = {
                resourceType: 'Parameters',
                parameter: [
                {
                    name: 'target',
                    valueReference: {
                    reference: 'Patient/' + targetPatientId
                    }
                },
                {
                    name: 'source',
                    valueReference: {
                    reference: 'Patient/' + candidatPatientId
                    }
                },
                {
                    name: 'mergeGoldenResource',
                    valueBoolean: true
                }
                ]
            };
            return mergePatientParams;
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating patient');
        }
    }
};

module.exports = helper;