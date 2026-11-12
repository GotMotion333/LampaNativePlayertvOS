(function () {
    'use strict';

    function initNativePlayer() {
        if (!window.Lampa) return;

        // 1. Регистрируем новый плеер в системе Лампы, чтобы он появился в выборе плееров
        if (Lampa.Player && Lampa.Player.players) {
            Lampa.Player.players.nativeplayer = {
                name: 'Native Player',
                // Можно указать иконку, если требуется, или оставить дефолтную
            };
        }

        // 2. Перехватываем стандартный метод запуска плеера
        const original_run = Lampa.Player.run;

        Lampa.Player.run = function (object) {
            const selected_player = Lampa.Storage.get('player', 'inner');

            // Проверяем, выбран ли в настройках наш Native Player
            if (selected_player === 'nativeplayer') {
                let video_url = object.url;

                // Если пришел массив источников, берем первый доступный
                if (Array.isArray(video_url)) {
                    video_url = video_url[0];
                }

                if (video_url) {
                    // Кодируем URL видео для безопасности передачи в параметры схемы
                    const encoded_url = encodeURIComponent(video_url);
                    
                    // Формируем deep link на основе данных со скриншота
                    // Можно использовать стандартный или x-callback вариант:
                    const deep_link = `nativeplayer://play?url=${encoded_url}`;
                    // Или с x-callback: `nativeplayer://x-callback-url/play?url=${encoded_url}`

                    console.log('NativePlayer: Opening URL ->', deep_link);

                    try {
                        // Перенаправляем на deep link, открывающий Native Player на Apple TV
                        window.location.href = deep_link;
                    } catch (e) {
                        console.error('NativePlayer execution error:', e);
                    }

                    // Предотвращаем запуск стандартного плеера Лампы
                    return;
                }
            }

            // Для остальных плееров выполняем стандартную логику
            return original_run.apply(this, arguments);
        };

        console.log('Native Player plugin initialized successfully.');
    }

    // Ожидаем полной инициализации Лампы
    if (window.Lampa) {
        initNativePlayer();
    } else {
        let check_interval = setInterval(() => {
            if (window.Lampa) {
                clearInterval(check_interval);
                initNativePlayer();
            }
        }, 100);
    }
})();
