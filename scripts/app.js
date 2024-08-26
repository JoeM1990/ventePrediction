function openModal() {
    document.getElementById("infoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

document.addEventListener('DOMContentLoaded', function () {
    let model;

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

    function parseCSV(data) {
        const lines = data.split('\n');
        const result = [];
        const headers = lines[0].split(',');  // Headers: date, product_name, category, sales
    
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length === 4) {  // Assure que chaque ligne a 4 colonnes
                result.push({
                    date: row[0],
                    product_name: row[1],
                    category: row[2],
                    sales: parseFloat(row[3])
                });
            }
        }
        return result;
    }

    // Fonction pour gérer les fichiers téléchargés
    function handleFiles(files) {
        console.log('Fichier chargé:', files);
        if (files.length === 0) return;
        const file = files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const data = event.target.result;
            const parsedData = parseData(data, file.type);
            if (parsedData) {
                console.log('Données parsées:', parsedData);
                trainModel(parsedData);
            }
        };

        reader.readAsText(file);
    }

    // Parsing CSV
    // function parseCSV(data) {
    //     const lines = data.split('\n');
    //     const result = [];
    //     for (let i = 1; i < lines.length; i++) {
    //         const row = lines[i].split(',');
    //         if (row.length === 2) {
    //             result.push({ date: row[0], sales: parseFloat(row[1]) });
    //         }
    //     }
    //     return result;
    // }

    // Préparer les données pour TensorFlow.js
    function prepareData(data) {
        const dates = [];
        const sales = [];
    
        data.forEach(record => {
            const date = new Date(record.date).getTime();
            if (!isNaN(date) && !isNaN(record.sales)) {
                dates.push(date);
                sales.push(record.sales);
            }
        });
    
        const tensorDates = tf.tensor2d(dates, [dates.length, 1]);
        const tensorSales = tf.tensor2d(sales, [sales.length, 1]);
    
        return { tensorDates, tensorSales };
    }
    

    // Entraînement du modèle TensorFlow.js
    async function trainModel(data) {
        const { tensorDates, tensorSales } = prepareData(data);
    
        if (tensorDates.shape[0] === 0 || tensorSales.shape[0] === 0) {
            console.error('Aucune donnée valide pour entraîner le modèle.');
            return;
        }
    
        model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [1], units: 1 }));
    
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
    
        try {
            await model.fit(tensorDates, tensorSales, { epochs: 100 });
        } catch (error) {
            console.error('Erreur lors de l\'entraînement du modèle:', error);
            return;
        }
    
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
        const predictedValues = predictedSales.dataSync();
    
        // Vérification des données prédictives
        console.log("Predicted Values: ", predictedValues);
    
        predictedValues.forEach((pred, index) => {
            predictions.push({ date: new Date(data[index].date).toLocaleDateString(), sales: pred });
        });
    
        displayResults(predictions);
        generateRecommendations(predictions);
    }
    

    // Affichage des résultats avec Chart.js
    function displayResults(predictions) {
        const ctx = document.getElementById('sales-chart').getContext('2d');
    
        // Vérification que l'élément canvas est présent
        if (!ctx) {
            console.error('Élément canvas "sales-chart" introuvable.');
            return;
        }
    
        // Préparer les labels et les données de ventes pour le graphique
        const labels = predictions.map(p => p.date); // Les étiquettes pour l'axe des x (dates)
        const salesData = predictions.map(p => p.sales); // Les données pour l'axe des y (ventes)
    
        // Vérification que les données sont correctes
        console.log("Labels: ", labels);
        console.log("Sales Data: ", salesData);
    
        // Détruire le graphique existant s'il y en a un (nécessaire si on redessine plusieurs fois)
        if (window.myChart) {
            window.myChart.destroy();
        }
    
        // Créer le graphique
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels, // Labels pour l'axe des x
                datasets: [{
                    label: 'Prédictions de Ventes',
                    data: salesData, // Données pour l'axe des y
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Ventes'
                        }
                    }
                }
            }
        });
    
        // const resultsSection = document.getElementById('results-section');
        // if (resultsSection) {
        //     resultsSection.classList.remove('hidden');
        // } else {
        //     console.error('Element with ID "results-section" not found.');
        // }
    }
    
    

    // Génération de recommandations
    function generateRecommendations(predictions) {
        const recommendations = document.getElementById('recommendations-list');
        recommendations.innerHTML = '';
    
        const averageSales = predictions.reduce((sum, p) => sum + p.sales, 0) / predictions.length;
        recommendations.innerHTML += `<p>Ventes moyennes prévues: ${averageSales.toFixed(2)}</p>`;
    
        const salesByCategory = {};
        predictions.forEach(p => {
            if (!salesByCategory[p.category]) {
                salesByCategory[p.category] = [];
            }
            salesByCategory[p.category].push(p.sales);
        });
    
        for (const category in salesByCategory) {
            const avgCategorySales = salesByCategory[category].reduce((sum, sales) => sum + sales, 0) / salesByCategory[category].length;
            recommendations.innerHTML += `<p>Catégorie ${category}: Ventes moyennes prévues: ${avgCategorySales.toFixed(2)}</p>`;
            
            if (avgCategorySales < 800) {
                recommendations.innerHTML += `<p>Recommandation pour la catégorie ${category}: Considérez une promotion pour augmenter les ventes.</p>`;
            } else {
                recommendations.innerHTML += `<p>Recommandation pour la catégorie ${category}: Les ventes sont bonnes. Maintenez votre stratégie actuelle.</p>`;
            }
        }
    }



    window.handleFiles = handleFiles;
});
