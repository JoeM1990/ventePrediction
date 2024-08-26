function openModal() {
    document.getElementById("infoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

document.addEventListener('DOMContentLoaded', function () {
    let model;

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

    function trainModel(data) {
        const { tensorDates, tensorSales } = prepareData(data);
        model = tf.sequential();
        model.add(tf.layers.dense({ inputShape: [1], units: 1 }));
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });

        model.fit(tensorDates, tensorSales, { epochs: 100 }).then(() => {
            console.log('Modèle entraîné avec succès');
            document.getElementById('infos-message').textContent = "Modèle entraîné avec succès";
            document.getElementById("messageModal").style.display = "block";
            setTimeout(function() {
                document.getElementById("messageModal").style.display = "none";
            }, 2000);

            makePredictions(data);
        });
    }

    function makePredictions(data) {
        const predictions = [];
        const { tensorDates } = prepareData(data);
        const predictedSales = model.predict(tensorDates);
        predictedSales.dataSync().forEach((pred, index) => {
            predictions.push({ date: new Date(data[index].date).toLocaleDateString(), sales: pred });
        });

        console.log('Prédictions:', predictions);
        displayResults(predictions);
        generateRecommendations(predictions);
    }

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
        console.log('Recommandations:', recommendations);
    }

    window.handleFiles = handleFiles;
});

