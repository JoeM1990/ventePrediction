function openModal() {
    document.getElementById("infoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

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
            document.getElementById('infos-message').textContent = "Format de fichier non supporté. Veuillez télécharger un fichier CSV ou JSON.";
            document.getElementById("messageModal").style.display = "block";

            setTimeout(function() {
                document.getElementById("messageModal").style.display = "none";
            }, 2000);

            return null;
        }
        return parsedData;
    }

    // Fonction pour parser les données CSV
    function parseCSV(data) {
        const lines = data.split('\n');
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length === 4) { // Assurez-vous qu'il y a 4 colonnes (Date, Category, Product, Sales)
                const date = row[0].trim();
                const sales = parseFloat(row[3].trim()); // Convertir la valeur des ventes en nombre
                if (!isNaN(sales)) { // Vérifiez que les ventes sont bien un nombre
                    result.push({ date: date, sales: sales });
                } else {
                    console.warn(`La ligne ${i} contient une valeur de vente invalide: ${row[3]}`);
                }
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
                dates.push(date.getTime());
                sales.push(record.sales);
            } else {
                console.warn("Données invalides détectées :", record);
            }
        });
    
        const tensorDates = tf.tensor2d(dates, [dates.length, 1]);
        const tensorSales = tf.tensor2d(sales, [sales.length, 1]);
    
        console.log("Tensor Dates: ", tensorDates.arraySync());
        console.log("Tensor Sales: ", tensorSales.arraySync());
    
        return { tensorDates, tensorSales };
    }

    // Entraînement du modèle TensorFlow.js
    async function trainModel(data) {
        const { tensorDates, tensorSales } = prepareData(data);

        model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [1], units: 1 }));

        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        await model.fit(tensorDates, tensorSales, { epochs: 100 });

        document.getElementById('infos-message').textContent = "Modèle entraîné avec succès";
        document.getElementById("messageModal").style.display = "block";

        setTimeout(function() {
            document.getElementById("messageModal").style.display = "none";
        }, 2000);

        makePredictions(data);
    }

    // Fonction de prédiction des ventes
    function makePredictions(data) {
        const predictions = [];
        const { tensorDates } = prepareData(data);

        const predictedSales = model.predict(tensorDates);

       

        predictedSales.data().then(predictedValues => {
            predictedValues.forEach((pred, index) => {
                predictions.push({ date: new Date(data[index].date).toLocaleDateString(), sales: pred });
            });

            displayResults(predictions);
            generateRecommendations(predictions);
            console.log(predictions);
        }).catch(error => {
            console.error('Erreur lors de la prédiction:', error);
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
                        type: 'time', // Assurez-vous que l'adaptateur de temps est inclus
                        time: {
                            unit: 'day', // Ajustez l'unité de temps comme nécessaire
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
    
        document.getElementById('results-section').classList.remove('hidden');
    }
    

    // Génération de recommandations
    function generateRecommendations(predictions) {
        const recommendations = document.getElementById('recommendations-list');
        recommendations.innerHTML = '';

        const averageSales = predictions.reduce((sum, p) => sum + p.sales, 0) / predictions.length;
        console.log(averageSales);
        recommendations.innerHTML += `<p>Ventes moyennes prévues: ${averageSales}</p>`;

        if (averageSales < 1000) {
            recommendations.innerHTML += `<p>Recommandation: Considérez une promotion pour augmenter les ventes.</p>`;
        } else {
            recommendations.innerHTML += `<p>Recommandation: Les ventes sont bonnes. Maintenez votre stratégie actuelle.</p>`;
        }
    }

    window.handleFiles = handleFiles;
});

