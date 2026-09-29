const URL_API_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbzr7EldVMDdF70DLiepdFMP7fYYRdjWAmz5-nkLnoSnto8-nCNF_pG7EcqqGjg6rgb5/exec";

let exchangeRates = {};
let costoUSA = 69.7; // Costo de vida base de USA según tus datos (United States: 69.7)

window.onload = async function() {
    const select = document.getElementById('paisDestino');
    select.innerHTML = "<option value=''>Cargando datos y tipos de cambio...</option>";

    try {
        // 1. Obtenemos las tasas de cambio globales actualizadas frente al USD
        const resRates = await fetch('https://open.er-api.com/v6/latest/USD');
        const dataRates = await resRates.json();
        if (dataRates && dataRates.rates) {
            exchangeRates = dataRates.rates;
        }

        // 2. Obtenemos los países desde tu Google Sheet
        const response = await fetch(URL_API_GOOGLE_SHEETS);
        const data = await response.json();
        
        select.innerHTML = "<option value=''>-- Selecciona un país --</option>"; 
        
        if (!Array.isArray(data) || data.length === 0) {
            return;
        }

        // Buscar el costo de vida específico de USA en la lista para mayor precisión
        let usaObj = data.find(p => p.iso === "USA" || (p.nombre && p.nombre.toLowerCase().includes("united states")));
        if (usaObj && !isNaN(parseFloat(usaObj.costoVida))) {
            costoUSA = parseFloat(usaObj.costoVida);
        }

        // Ordenar los países alfabéticamente
        data.sort((a, b) => {
            let nombreA = (a.nombre || "").toString();
            let nombreB = (b.nombre || "").toString();
            return nombreA.localeCompare(nombreB);
        });

        data.forEach(paisObj => {
            let nombrePais = paisObj.nombre;
            let codigoMoneda = paisObj.moneda || "USD";
            let costoDeVidaPais = parseFloat(paisObj.costoVida); // Tomamos directamente el costo de vida
            
            if (nombrePais && !isNaN(costoDeVidaPais)) {
                let option = document.createElement('option');
                option.value = costoDeVidaPais; // Guardamos el costo de vida de la columna D
                option.dataset.moneda = codigoMoneda;
                option.text = `${nombrePais} (${codigoMoneda})`;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        select.innerHTML = "<option value=''>Error al cargar los datos</option>";
    }
};

function calcularEnvio() {
    let montoBase = parseFloat(document.getElementById('montoBase').value);
    let selectPais = document.getElementById('paisDestino');
    let costoDeVidaPais = parseFloat(selectPais.value);
    
    if (isNaN(montoBase) || montoBase < 0 || isNaN(costoDeVidaPais) || selectPais.value === "") {
        document.getElementById('resultadoUSD').innerText = "Monto ajustado: $0.00 USD";
        document.getElementById('resultadoLocal').innerText = "Equivalente local: 0.00";
        return;
    }

    // 1. Monto ajustado en dólares utilizando la proporción del costo de vida (Costo País / Costo USA)
    let montoAjustadoUSD = montoBase * (costoDeVidaPais / costoUSA); 
    document.getElementById('resultadoUSD').innerText = "Monto ajustado: $" + montoAjustadoUSD.toFixed(2) + " USD";

    // 2. Obtener la moneda y buscar su tipo de cambio real frente al dólar
    let optionSeleccionada = selectPais.options[selectPais.selectedIndex];
    let monedaLocal = optionSeleccionada ? optionSeleccionada.dataset.moneda : 'USD';
    let tipoCambio = exchangeRates[monedaLocal] || 1;

    // 3. Calcular la equivalencia en moneda local multiplicando los dólares ajustados por el tipo de cambio
    let montoEquivalenteLocal = montoAjustadoUSD * tipoCambio;

    document.getElementById('resultadoLocal').innerText = `Equivalente en ${monedaLocal}: ${montoEquivalenteLocal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${monedaLocal}`;
}