document.addEventListener('DOMContentLoaded', function () {
    let model;

    // Fonction pour gérer les fichiers téléchargés
    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const data = event.target.result;
            const parsedData = parseData(data, file.type);
            if (parsedData) {
                trainModel(parsedData);
            }
        };

        reader.readAsText(file);
    }

    // Fonction de parsing des données CSV ou JSON
    function parseData(data, type) {
        let parsedData;
        if (type === 'application/json') {
            parsedData = JSON.parse(data);
        } else if (type === 'text/csv') {
            parsedData = parseCSV(data);
        } else {
            showAlert("Format de fichier non supporté. Veuillez télécharger un fichier CSV ou JSON.");
            return null;
        }
        return parsedData;
    }

    // Fonction pour parser les données CSV
    function parseCSV(data) {
        const lines = data.split('\n').filter(line => line.trim() !== '');
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');

            if (row.length === 4) {
                const date = new Date(row[0].trim());
                const category = row[1].trim();
                const product = row[2].trim();
                const sales = parseFloat(row[3].trim());

                if (!isNaN(date.getTime()) && !isNaN(sales)) {
                    result.push({ date, category, product, sales });
                } else {
                    console.warn(`Données invalides détectées dans la ligne ${i + 1}: `, row);
                }
            } else {
                console.warn(`Ligne mal formatée détectée à la ligne ${i + 1}: `, row);
            }
        }
        return result;
    }

    // Préparer les données pour TensorFlow.js
    function prepareData(data) {
        const dates = [];
        const sales = [];

        data.forEach(record => {
            const date = new Date(record.date);
            if (!isNaN(date.getTime()) && !isNaN(record.sales)) {
                dates.push(date.getTime() / (1000 * 60 * 60 * 24)); // Convertir en jours
                sales.push(record.sales);
            } else {
                console.warn("Données invalides détectées :", record);
            }
        });

        if (dates.length === 0 || sales.length === 0) {
            console.error("Aucune donnée valide trouvée après la préparation des données.");
            return null;
        }

        const tensorDates = tf.tensor2d(dates, [dates.length, 1], 'float32');
        const tensorSales = tf.tensor2d(sales, [sales.length, 1], 'float32');

        console.log("Tensor Dates: ", tensorDates.arraySync());
        console.log("Tensor Sales: ", tensorSales.arraySync());

        return { tensorDates, tensorSales };
    }
    

    // Entraînement du modèle TensorFlow.js
    async function trainModel(data) {
        const { tensorDates, tensorSales } = prepareData(data);

        if (!tensorDates || !tensorSales) {
            showAlert("Les données ne sont pas prêtes pour l'entraînement.");
            return;
        }

        model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [1], units: 1 }));

        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        console.log("Entraînement du modèle...");
        await model.fit(tensorDates, tensorSales, { epochs: 100 });

        showAlert("Modèle entraîné avec succès");
        makePredictions(data);
    }

    // Fonction de prédiction des ventes
    function makePredictions(data) {
        const preparedData = prepareData(data);
        if (!preparedData) {
            showAlert("Les données préparées sont invalides.");
            return;
        }

        const { tensorDates } = preparedData;
        const predictions = model.predict(tensorDates);

        predictions.array().then(predictedValues => {
            console.log("Predicted Values: ", predictedValues);

            // Assurez-vous que predictedValues contient des données valides
            if (predictedValues.length === 0 || predictedValues[0][0] === null) {
                console.error("Les valeurs prédites sont nulles ou vides.");
                showAlert("Erreur dans les prédictions : valeurs nulles détectées.");
                return;
            }

            const results = data.map((record, index) => ({
                date: new Date(record.date).toLocaleDateString(),
                sales: predictedValues[index][0] // Extraire la valeur du tableau
            }));

            displayResults(results);
            generateRecommendations(results);
        }).catch(error => {
            showAlert("Erreur lors de la prédiction: " + error);
        });
    }

    // Affichage des résultats avec Chart.js
    function displayResults(predictions) {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        const labels = predictions.map(p => p.date);
        const salesData = predictions.map(p => p.sales);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Prédictions de Ventes',
                    data: salesData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Ventes'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    // Génération de recommandations
    function generateRecommendations(predictions) {
        const recommendations = document.getElementById('recommendations-list');
        recommendations.innerHTML = '';

        const averageSales = predictions.reduce((sum, p) => sum + p.sales, 0) / predictions.length;

        recommendations.innerHTML += `<p>Ventes moyennes prévues: ${parseInt(averageSales)}</p>`;

        if (averageSales < 1000) {
            recommendations.innerHTML += `<p>Recommandation: Considérez une promotion pour augmenter les ventes.</p>`;
        } else {
            recommendations.innerHTML += `<p>Recommandation: Les ventes sont bonnes. Maintenez votre stratégie actuelle.</p>`;
        }
    }

    function showAlert(message) {
        document.getElementById('infos-message').textContent = message;
        document.getElementById("messageModal").style.display = "block";

        setTimeout(function() {
            document.getElementById("messageModal").style.display = "none";
        }, 2000);
    }

    window.handleFiles = handleFiles;
});
