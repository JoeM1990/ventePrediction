function openModal() {
    document.getElementById("infoModal").style.display = "block";
}

function closeModal() {
    document.getElementById("infoModal").style.display = "none";
}

// scripts.js

document.addEventListener("DOMContentLoaded", function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileElem');

    // Empêcher le comportement par défaut des événements de drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Mettre en évidence la zone de drop au survol
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.classList.add('highlight');
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.classList.remove('highlight');
    });

    // Gérer les fichiers déposés
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        handleFiles(files);
    }

    function handleFiles(files) {
        [...files].forEach(processFile);
    }

    function processFile(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            let salesData;
            
            if (file.type === 'application/json') {
                salesData = JSON.parse(fileContent);
            } else if (file.type === 'text/csv') {
                salesData = parseCSV(fileContent);
            }
            
            trainAndPredict(salesData);
        };
        reader.readAsText(file);
    }

    // Fonction pour analyser le CSV
   

    // Fonction d'entraînement et de prédiction
    function trainAndPredict(data) {
        // Code d'entraînement TensorFlow.js ici
        // Code de prédiction ici

        // Code d'affichage des résultats ici
        updateChart(predictions);
        updateRecommendations(predictions);
    }

    // Mettre à jour le graphique
    function updateChart(predictions) {
        const ctx = document.getElementById('sales-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: predictions.map(p => p.date),
                datasets: [{
                    label: 'Prédictions de Ventes',
                    data: predictions.map(p => p.sales),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            }
        });
    }

    // Mettre à jour les recommandations
    function updateRecommendations(predictions) {
        const recommendationsList = document.getElementById('recommendations-list');
        recommendationsList.innerHTML = '';  // Clear previous recommendations

        // Exemple de génération de recommandations
        const avgSales = predictions.reduce((sum, p) => sum + p.sales, 0) / predictions.length;
        const recommendationText = avgSales > 500 ? 
            "Considérez une promotion pour stimuler encore plus les ventes!" :
            "Réduisez l'inventaire pour éviter un surstockage.";

        const item = document.createElement('div');
        item.className = 'recommendation-item animate__fadeInUp';
        item.textContent = recommendationText;
        recommendationsList.appendChild(item);
    }
});
