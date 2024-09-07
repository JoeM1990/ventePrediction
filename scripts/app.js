/* Author: Jonathan Monkila */

function openModal() {
    document.getElementById("infoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

let datePredict;
let salesPredict;

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

    const dropArea = document.getElementById('drop-area');

    dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropArea.classList.add('hover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('hover');
    });

    dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        dropArea.classList.remove('hover');
        handleFiles(event.dataTransfer.files);
    });

    // Fonction de parsing des données CSV ou JSON
    function parseData(data, type) {
        let parsedData;
        if (type === 'application/json') {
            parsedData = JSON.parse(data);
        } else if (type === 'text/csv') {
            parsedData = parseCSV(data);
        } else {
           showAlert('Format de fichier non supporté. Veuillez télécharger un fichier CSV ou JSON.');
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

            if (row.length === 4) {
                const date = row[0].trim();
                const category = row[1].trim();
                const product = row[2].trim();
                const sales = parseFloat(row[3].trim());
    
                if (!isNaN(sales)) {
                    result.push({ date, category, product, sales });
                } else {
                    console.warn(`Valeur de vente invalide détectée dans la ligne ${i + 1}: `, row);
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
                dates.push(date.getTime());
                sales.push(record.sales);
            } else {
                console.warn("Données invalides détectées :", record);
            }
        });
    
        if (dates.length === 0 || sales.length === 0) {
            showAlert('Aucune donnée valide trouvée après la préparation des données.');
            return null;
        }

        // Normalisation des données
        const maxDate = Math.max(...dates);
        const maxSales = Math.max(...sales);

        const tensorDates = tf.tensor2d(dates.map(d => d / maxDate), [dates.length, 1]);
        const tensorSales = tf.tensor2d(sales.map(s => s / maxSales), [sales.length, 1]);

        datePredict = tensorDates.arraySync();
        salesPredict = tensorSales.arraySync();
    
        return { tensorDates, tensorSales, maxDate, maxSales };
    }

    // Entraînement du modèle TensorFlow.js
    async function trainModel(data) {
        const { tensorDates, tensorSales, maxDate, maxSales } = prepareData(data);
        if (!tensorDates || !tensorSales) return;

        model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [1], units: 10, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1 }));

        model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

        await model.fit(tensorDates, tensorSales, { epochs: 100 });

        showAlert('Modèle entraîné avec succès');
        
        makePredictions(data, maxDate, maxSales);
    }

    // Fonction de prédiction des ventes
    function makePredictions(data, maxDate, maxSales) {
        const predictions = [];
        const preparedData = prepareData(data);
        if (!preparedData) {
           showAlert('Les données préparées sont invalides.');
            return;
        }
        
        const { tensorDates } = preparedData;
        const predictedSales = model.predict(tensorDates);
        
        // predictedSales.data().then(predictedValues => {
        //     predictedValues = predictedValues.map(v => v * maxSales); // Dénormalisation des ventes
        //     predictedValues.forEach((pred, index) => {
        //         predictions.push({ date: new Date(data[index].date).toLocaleDateString(), sales: pred });
        //     });
    
        //     if (predictions.some(p => isNaN(p.sales))) {
        //         showAlert("Des valeurs NaN ont été détectées dans les prédictions");
        //         return;
        //     }
    
        //     displayResults(predictions);
        //     generateRecommendations(predictions);
        // }).catch(error => {
        //    showAlert("Erreur lors de la prédiction:" + error)
        //    console.log(error);
        // });
        predictedSales.data().then(predictedValues => {
            predictedValues = predictedValues.map(v => v * maxSales); // Dénormalisation des ventes
            predictedValues.forEach((pred, index) => {
                predictions.push({ date: new Date(data[index].date).toLocaleDateString(), sales: pred });
            });
        
            if (predictions.some(p => isNaN(p.sales))) {
                showAlert("Des valeurs NaN ont été détectées dans les prédictions");
                return;
            }
        
            displayResults(predictions);
            generateRecommendations(predictions, data);  // Modification ici
        }).catch(error => {
            showAlert("Erreur lors de la prédiction:" + error);
            console.log(error);
        });
        
    }

    // Affichage des résultats avec Chart.js
    function displayResults(predictions) {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        const labels = predictions.map(p => p.date); // Dates des prédictions
        const salesData = predictions.map(p => p.sales); // Ventes prédites
    
        // Détruire l'ancien graphique avant d'en créer un nouveau pour éviter les erreurs
        if (window.salesChart) {
            window.salesChart.destroy();
        }
    
        window.salesChart = new Chart(ctx, {
            type: 'line', 
            data: {
                labels: labels, 
                datasets: [{
                    label: 'Prédictions de Ventes',
                    data: salesData, 
                    borderColor: 'rgba(75, 192, 192, 1)', 
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4 
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'time', // Type de l'axe X
                        time: {
                            unit: 'day' // Unité de temps: jour
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        beginAtZero: true, // L'axe Y commence à 0
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
                },
                responsive: true,
                maintainAspectRatio: false 
            }
        });
    
        // Affichage des résultats
        document.getElementById("results-pred").style.display = "block";
        document.getElementById("results-rec").style.display = "block";
    }
    

    // Génération de recommandations
    function generateRecommendations(predictions, data) {
        const recommendations = document.getElementById('recommendations-list');
        recommendations.innerHTML = '';
    
        const averageSales = predictions.reduce((sum, p) => sum + p.sales, 0) / predictions.length;
        
        recommendations.innerHTML += `<p>Ventes moyennes prévues: ${parseFloat(averageSales.toFixed(2))}</p>`;
    
        if (averageSales < 1000) {
            recommendations.innerHTML += `<p>Recommandation: Considérez une promotion pour augmenter les ventes globales.</p>`;
        } else {
            recommendations.innerHTML += `<p>Recommandation: Les ventes sont bonnes. Maintenez votre stratégie actuelle.</p>`;
        }
    
        // Produits à améliorer
        const lowSalesProducts = predictions
            .filter((p, index) => p.sales < averageSales)
            .map((p, index) => data[index].product);
    
        if (lowSalesProducts.length > 0) {
            recommendations.innerHTML += `<p>Produits nécessitant une attention particulière : ${lowSalesProducts.join(', ')}.</p>`;
        } else {
            recommendations.innerHTML += `<p>Tous les produits semblent avoir des ventes satisfaisantes.</p>`;
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
