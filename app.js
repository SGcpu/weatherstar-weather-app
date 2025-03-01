
const CONFIG = {
    API_KEY: '', // Replace with your API key
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    UNITS: 'metric'
};

class WeatherDashboard {
    constructor() {
        this.currentWeather = null;
        this.forecast = null;
        this.airQuality = null;
        this.tempChart = null;
        this.aqiChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupThemeToggle();
        this.loadSavedTheme();
    }

    setupEventListeners() {
        const searchInput = document.querySelector('.search-box input');
        const searchButton = document.querySelector('.search-box button');

        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const city = searchInput.value.trim();
                if (city) {
                    await this.searchCity(city);
                }
            }
        });

        searchButton.addEventListener('click', async () => {
            const city = searchInput.value.trim();
            if (city) {
                await this.searchCity(city);
            }
        });

        const refreshBtn = document.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', () => {
            if (this.currentWeather) {
                this.searchCity(document.querySelector('.city-name').textContent);
            }
        });
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
            const icon = themeToggle.querySelector('i');
            icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            const themeToggle = document.querySelector('.theme-toggle i');
            themeToggle.className = 'fas fa-sun';
        }
    }

    async searchCity(city) {
        try {
            const response = await fetch(
                `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${CONFIG.API_KEY}`
            );
            const [location] = await response.json();

            if (location) {
                await this.loadWeatherData(location.lat, location.lon, location.name);
            } else {
                this.showError('City not found. Please check the spelling and try again.');
            }
        } catch (error) {
            this.showError('Failed to search city. Please try again.');
        }
    }

    async loadWeatherData(lat, lon, cityName) {
        try {
            const [currentWeather, forecast, airQuality] = await Promise.all([
                this.fetchCurrentWeather(lat, lon),
                this.fetchForecast(lat, lon),
                this.fetchAirQuality(lat, lon)
            ]);

            this.updateDashboard(currentWeather, forecast, airQuality, cityName);
        } catch (error) {
            console.error('Error loading weather data:', error);
            this.showError('Failed to load weather data. Please try again.');
        }
    }

    async fetchCurrentWeather(lat, lon) {
        const response = await fetch(
            `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`
        );
        return response.json();
    }

    async fetchForecast(lat, lon) {
        const response = await fetch(
            `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${CONFIG.UNITS}&appid=${CONFIG.API_KEY}`
        );
        return response.json();
    }

    async fetchAirQuality(lat, lon) {
        const response = await fetch(
            `${CONFIG.BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}`
        );
        return response.json();
    }

    updateDashboard(currentWeather, forecast, airQuality, cityName) {
        
        document.querySelector('.city-name').textContent = cityName;
        document.querySelector('.location span').textContent = `${cityName}, ${currentWeather.sys.country}`;
        document.querySelector('.temp-value').textContent = `${Math.round(currentWeather.main.temp)}°`;
        document.querySelector('.weather-desc').textContent = currentWeather.weather[0].description;
        const weatherIcon = document.querySelector('.weather-icon i');
        weatherIcon.className = this.getWeatherIconClass(currentWeather.weather[0].icon);
        document.querySelector('.detail-item:nth-child(1) .value').textContent = `${currentWeather.main.humidity}%`;
        document.querySelector('.detail-item:nth-child(2) .value').textContent = `${currentWeather.wind.speed} m/s`;
        document.querySelector('.detail-item:nth-child(3) .value').textContent = `${currentWeather.main.pressure} hPa`;
        document.querySelector('.detail-item:nth-child(4) .value').textContent = `${(currentWeather.visibility / 1000).toFixed(1)} km`;


        const aqi = airQuality.list[0].main.aqi;
        this.updateAQIDonut(aqi);

        
        if (currentWeather.sys && currentWeather.sys.sunrise && currentWeather.sys.sunset) {
            this.updateSunTimes(currentWeather.sys.sunrise, currentWeather.sys.sunset);
        }

        
        if (forecast.list && Array.isArray(forecast.list)) {
            this.updateForecast(forecast);
            this.updateTemperatureGraph(forecast);
        } else {
            console.error('Invalid forecast data:', forecast);
            this.showError('Error loading forecast data');
        }
    }

    updateSunTimes(sunrise, sunset) {
        const sunriseTime = new Date(sunrise * 1000);
        const sunsetTime = new Date(sunset * 1000);

        
        const sunriseElement = document.querySelector('.sunrise span');
        sunriseElement.textContent = sunriseTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

       
        const sunsetElement = document.querySelector('.sunset span');
        sunsetElement.textContent = sunsetTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        
        const now = new Date().getTime() / 1000;
        const totalDayTime = sunset - sunrise;
        const currentProgress = now - sunrise;
        const progressPercentage = Math.min(Math.max((currentProgress / totalDayTime) * 100, 0), 100);

        const sunPosition = document.querySelector('.sun-position');
        if (sunPosition) {
            sunPosition.style.left = `${progressPercentage}%`;
        }
    }

    updateAQIDonut(aqi) {
        const ctx = document.querySelector('.aqi-display canvas');
        if (!ctx) return;

        
        const percentage = (aqi / 5) * 100;

        
        const aqiDesc = this.getAQIDescription(aqi);

        if (this.aqiChart) {
            this.aqiChart.destroy();
        }

        this.aqiChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [percentage, 100 - percentage],
                    backgroundColor: [
                        this.getAQIColor(aqi),
                        'rgba(200, 200, 200, 0.2)'
                    ],
                    borderWidth: 0,
                    circumference: 270,
                    rotation: 225
                }]
            },
            options: {
                cutout: '80%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            },
            plugins: [{
                id: 'aqiText',
                beforeDraw: (chart) => {
                    const width = chart.width;
                    const height = chart.height;
                    const ctx = chart.ctx;
                    ctx.restore();

                    
                    ctx.font = 'bold 24px Space Grotesk';
                    ctx.fillStyle = 'var(--text)';
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'center';
                    ctx.fillText(aqiDesc.value, width / 2, height / 2 - 10);

                    
                    ctx.font = '14px Space Grotesk';
                    ctx.fillStyle = 'var(--text-light)';
                    ctx.fillText(aqiDesc.label, width / 2, height / 2 + 15);

                    ctx.save();
                }
            }]
        });
    }

    groupForecastByDay(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(forecast => {
            const date = new Date(forecast.dt * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = [];
            }
            
            dailyData[dateStr].push(forecast);
        });
        
        return dailyData;
    }

    updateTemperatureGraph(forecast) {
        const ctx = document.querySelector('.temp-chart canvas');
        if (!ctx) return;
    
        
        const next24Hours = forecast.list.slice(0, 8);
        
        const labels = next24Hours.map(item => 
            new Date(item.dt * 1000).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit'
            })
        );
        
        const temperatures = next24Hours.map(item => Math.round(item.main.temp));
    
        if (this.tempChart) {
            this.tempChart.destroy();
        }
    
        this.tempChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Temperature',
                    data: temperatures,
                    borderColor: 'var(--primary)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'var(--primary)',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Temperature: ${context.raw}°C`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(200, 200, 200, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    updateForecast(forecast) {
        const forecastList = document.querySelector('.forecast-list');
        forecastList.innerHTML = '';
        
        const dailyData = this.groupForecastByDay(forecast.list);
        
        Object.entries(dailyData).slice(0, 5).forEach(([dateStr, dayData]) => {
            const date = new Date(dateStr);
            
            
            const noonForecast = dayData.reduce((closest, current) => {
                const currentHour = new Date(current.dt * 1000).getHours();
                const closestHour = new Date(closest.dt * 1000).getHours();
                return Math.abs(currentHour - 12) < Math.abs(closestHour - 12) ? current : closest;
            }, dayData[0]);
            
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            
            forecastItem.innerHTML = `
                <span class="day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <img src="https://openweathermap.org/img/wn/${noonForecast.weather[0].icon}.png" alt="weather icon">
                <span class="temp">${Math.round(noonForecast.main.temp)}°</span>
            `;
            
            forecastList.appendChild(forecastItem);
        });
    }

    getWeatherIconClass(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-cloud',
            '04n': 'fas fa-cloud',
            '09d': 'fas fa-cloud-showers-heavy',
            '09n': 'fas fa-cloud-showers-heavy',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };

        return iconMap[iconCode] || 'fas fa-question';
    }

    getAQIDescription(aqi) {
        const aqiMap = {
            1: { value: 'Good', label: 'AQI' },
            2: { value: 'Fair', label: 'AQI' },
            3: { value: 'Moderate', label: 'AQI' },
            4: { value: 'Poor', label: 'AQI' },
            5: { value: 'Very Poor', label: 'AQI' }
        };
        return aqiMap[aqi] || { value: 'N/A', label: 'AQI' };
    }

    getAQIColor(aqi) {
        const aqiColorMap = {
            1: '#22c55e', 
            2: '#eab308', 
            3: '#ef4444', 
            4: '#7c3aed', 
            5: '#6b21a8'  
        };
        return aqiColorMap[aqi] || '#cccccc';
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
    
}


document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new WeatherDashboard();
});