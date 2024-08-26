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
            alert('Format de fichier non supporté. Veuillez télécharger un fichier CSV ou JSON.');
            return null;
        }
        return parsedData;
    }

    // Parsing CSV
    function parseCSV(data) {
        const lines = data.split('\n');
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length === 4) {
                const date = row[0];
                const category = row[1];
                const product = row[2];
                const sales = parseFloat(row[3]);
                if (!isNaN(sales)) {
                    result.push({ date, category, product, sales });
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
            const date = new Date(record.date).getTime();
            if (!isNaN(date) && !isNaN(record.sales)) {
                dates.push(date);
                sales.push(record.sales);
            }
        });

        if (dates.length === 0 || sales.length === 0) {
            console.error("Aucune donnée valide trouvée après la préparation des données.");
            return null;
        }

        const tensorDates = tf.tensor2d(dates, [dates.length, 1]);
        const tensorSales = tf.tensor2d(sales, [sales.length, 1]);

        console.log("Tensor Dates: ", tensorDates.arraySync());
        console.log("Tensor Sales: ", tensorSales.arraySync());

        return { tensorDates, tensorSales };
    }

    // Entraînement du modèle TensorFlow.js
    async function trainModel(data) {
        const preparedData = prepareData(data);
        if (!preparedData) return;

        const { tensorDates, tensorSales } = preparedData;

        model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [1], units: 1 }));

        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        await model.fit(tensorDates, tensorSales, { epochs: 100 });

        console.log('Modèle entraîné avec succès');
        makePredictions(data);
    }

    // Fonction de prédiction des ventes
    function makePredictions(data) {
        const preparedData = prepareData(data);
        if (!preparedData) {
            console.error('Les données préparées sont invalides.');
            return;
        }

        const { tensorDates } = preparedData;
        const predictedSales = model.predict(tensorDates);

        predictedSales.data().then(predictedValues => {
            const predictions = predictedValues.map((pred, index) => ({
                date: new Date(data[index].date).toLocaleDateString(),
                sales: pred
            }));

            console.log("Predicted Values: ", predictedValues);
            
            if (predictions.some(p => isNaN(p.sales))) {
                console.warn("Des valeurs NaN ont été détectées dans les prédictions.");
                return;
            }

            displayResults(predictions);
            generateRecommendations(predictions);
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
            }
        });

        document.getElementById('results-section').classList.remove('hidden');
    }

    // Génération de recommandations
    function generateRecommendations(predictions) {
        const recommendations = document.getElementById('recommendations-list');
        recommendations.innerHTML = '';

        const averageSales = predictions.reduce((sum, p) => sum + p.sales, 0) / predictions.length;
        recommendations.innerHTML += `<p>Ventes moyennes prévues: ${averageSales.toFixed(2)}</p>`;

        if (averageSales < 1000) {
            recommendations.innerHTML += `<p>Recommandation: Considérez une promotion pour augmenter les ventes.</p>`;
        } else {
            recommendations.innerHTML += `<p>Recommandation: Les ventes sont bonnes. Maintenez votre stratégie actuelle.</p>`;
        }
    }

    window.handleFiles = handleFiles;
});
