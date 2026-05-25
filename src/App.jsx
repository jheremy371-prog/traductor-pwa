import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './App.css'; 

function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('es');
  const [targetLang, setTargetLang] = useState('en');
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);

  // Cargar historial de LocalStorage al iniciar la PWA
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('translationHistory')) || [];
    setHistory(savedHistory);
  }, []);

  // Función para guardar en el historial (máximo 5 traducciones)
  const saveToHistory = (original, translation) => {
    const newEntry = { original, translation, sourceLang, targetLang };
    const updatedHistory = [newEntry, ...history].slice(0, 5);
    setHistory(updatedHistory);
    localStorage.setItem('translationHistory', JSON.stringify(updatedHistory));
  };

  // 1. Lógica de Traducción Segura con Gemini SDK
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setTranslatedText('Traduciendo con IA...');

    try {
      // Llamada segura a la variable de entorno
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        setTranslatedText('Error: API Key no encontrada en el archivo .env');
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const sourceName = sourceLang === 'es' ? 'Español' : 'Inglés';
      const targetName = targetLang === 'es' ? 'Español' : 'Inglés';

      // Prompt Engineering para mejores resultados
      const prompt = `Actúa como un traductor bilingüe nativo. Traduce el siguiente texto del ${sourceName} al ${targetName}, manteniendo el tono y el contexto cultural, no hagas traducciones literales.
      
      Texto a traducir: "${inputText}"
      
      Regla estricta: Devuelve ÚNICAMENTE el texto traducido. No agregues comillas, ni introducciones, ni notas adicionales.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const finalTranslation = response.text().trim();
      
      setTranslatedText(finalTranslation);
      saveToHistory(inputText, finalTranslation);

    } catch (error) {
      console.error("Error en la API de Gemini:", error);
      setTranslatedText('Hubo un error al conectar con la IA. Revisa la consola o verifica tu API Key.');
    }
  };

  // 2. Entrada de Voz Robusta (Web Speech API)
  const startListening = () => {
    // 1. Verificación estricta del soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setTranslatedText("Error: Tu navegador no incluye el motor de reconocimiento de voz.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      
      // 2. Parámetros estrictos para evitar sobrecarga de red
      recognition.lang = sourceLang === 'es' ? 'es-ES' : 'en-US';
      recognition.continuous = false; // Detiene la escucha tras una sola frase
      recognition.interimResults = false; // No envía datos incompletos, reduce carga
      recognition.maxAlternatives = 1; // Solo pide una opción de traducción

      // 3. Eventos detallados
      recognition.onstart = () => {
        setIsListening(true);
        setTranslatedText("Escuchando... (habla ahora)");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setTranslatedText(''); // Limpia el mensaje de escucha
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        // Imprime el error exacto en la interfaz visual
        setTranslatedText(`Error del motor de voz: ${event.error}`);
        console.error("Detalle del error:", event);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();

    } catch (error) {
      setIsListening(false);
      setTranslatedText("Error fatal en el código al inicializar el micrófono.");
      console.error("Código roto:", error);
    }
  };

  // 3. Salida de Voz (Speech Synthesis API)
  const speakTranslation = () => {
    if (!translatedText) return;
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = targetLang === 'es' ? 'es-ES' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="mobile-container">
      <header>
        <h1>Traductor IA</h1>
      </header>

      {/* Tarjeta Principal de Traducción */}
      <main className="card">
        <div className="language-selectors">
          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
          <span className="arrow">➔</span>
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            <option value="en">Inglés</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div className="input-area">
          <textarea 
            placeholder="Escribe o dicta el texto aquí..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
          />
          <button 
            className={`mic-btn ${isListening ? 'listening' : ''}`} 
            onClick={startListening}
            title="Dictar por voz"
          >
            {isListening ? '🎙️ Escuchando...' : '🎤 Dictar'}
          </button>
        </div>

        <button className="translate-btn" onClick={handleTranslate}>
          Traducir
        </button>

        {translatedText && (
          <div className="result-area">
            <p className="translated-output">{translatedText}</p>
            <button className="listen-btn" onClick={speakTranslation} title="Escuchar traducción">
              🔊 Escuchar
            </button>
          </div>
        )}
      </main>

      {/* Historial de Traducciones Recientes */}
      {history.length > 0 && (
        <section className="history-section">
          <h3>Últimas Traducciones</h3>
          <ul>
            {history.map((item, index) => (
              <li key={index} className="history-item">
                <span className="history-langs">
                  {item.sourceLang.toUpperCase()} ➔ {item.targetLang.toUpperCase()}
                </span>
                <strong>{item.original}</strong>
                <p>{item.translation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default App;