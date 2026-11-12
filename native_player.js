(function () {
    'use strict';

    function initNativePlayer() {
        if (!window.Lampa || !window.Lampa.Player) return;

        // 1. Безопасно регистрируем плеер в системном реестре Лампы
        try {
            if (!window.Lampa.Player.players) {
                window.Lampa.Player.players = {};
            }
            window.Lampa.Player.players.nativeplayer = {
                name: 'Native Player'
            };
        } catch (e) {
            console.error('NativePlayer registration error:', e);
        }

        // 2. Перехватываем метод запуска воспроизведения с защитой от сбоев
        const original_run = window.Lampa.Player.run;
        if (original_run) {
            window.Lampa.Player.run = function (object) {
                try {
                    const selected_player = window.Lampa.Storage.get('player', 'inner');

                    if (selected_player === 'nativeplayer') {
                        let video_url = object.url;

                        if (Array.isArray(video_url)) {
                            video_url = video_url[0];
                        }

                        if (video_url) {
                            const encoded_url = encodeURIComponent(video_url);
                            const deep_link = `nativeplayer://play?url=${encoded_url}`;

                            console.log('NativePlayer: Opening ->', deep_link);
                            window.location.href = deep_link;
                            return; // Предотвращаем стандартный запуск Лампы
                        }
                    }
                } catch (err) {
                    console.error('NativePlayer execution failed:', err);
                }

                // Если выбран другой плеер или произошла ошибка — передаем управление дальше
                return original_run.apply(this, arguments);
            };
        }

        console.log('Native Player plugin loaded successfully.');
    }

    // Инициализация при готовности Лампы
    if (window.Lampa && window.Lampa.Player) {
        initNativePlayer();
    } else {
        let attempts = 0;
        let interval = setInterval(() => {
            attempts++;
            if (window.Lampa && window.Lampa.Player) {
                clearInterval(interval);
                initNativePlayer();
            } else if (attempts > 50) {
                clearInterval(interval);
            }
        }, 200);
    }
})();
