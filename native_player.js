(function () {
    'use strict';

    function registerPlayerOption() {
        if (window.Lampa && Lampa.Params && Lampa.Params.values) {
            if (Lampa.Params.values.player) {
                Lampa.Params.values.player['nativeplayer'] = 'Native Player';
            }
            if (Lampa.Params.values.player_torrent) {
                Lampa.Params.values.player_torrent['nativeplayer'] = 'Native Player';
            }
            if (Lampa.Params.values.player_iptv) {
                Lampa.Params.values.player_iptv['nativeplayer'] = 'Native Player';
            }
        }
    }

    function startPlugin() {
        if (window.lampa_native_player_plugin) return;
        window.lampa_native_player_plugin = true;

        registerPlayerOption();

        // Гарантируем появление пункта Native Player в выпадающем списке при клике на выбор плеера
        if (Lampa.Select && Lampa.Select.show && !Lampa.Select.__native_patched) {
            Lampa.Select.__native_patched = true;
            var origSelectShow = Lampa.Select.show;

            Lampa.Select.show = function (params) {
                try {
                    if (params && Array.isArray(params.items)) {
                        var isPlayerMenu = params.items.some(function (item) {
                            return item && (item.value === 'infuse' || item.value === 'inner' || item.value === 'vlc' || item.value === 'ios');
                        });

                        var hasNative = params.items.some(function (item) {
                            return item && item.value === 'nativeplayer';
                        });

                        if (isPlayerMenu && !hasNative) {
                            registerPlayerOption();
                            params.items.push({
                                title: 'Native Player',
                                value: 'nativeplayer',
                                selected: false
                            });
                        }
                    }
                } catch (e) {
                    console.error('NativePlayer Select patch error:', e);
                }
                return origSelectShow.apply(this, arguments);
            };
        }

        // Корректно отображаем название выбранного плеера в меню Настройки -> Плеер
        if (Lampa.Settings && Lampa.Settings.listener) {
            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name === 'player') {
                    registerPlayerOption();
                    setTimeout(function () {
                        ['player', 'player_torrent', 'player_iptv'].forEach(function (field) {
                            if (Lampa.Storage.get(field) === 'nativeplayer' && e.body) {
                                e.body.find('[data-name="' + field + '"] .settings-param__value').text('Native Player');
                            }
                        });
                    }, 50);
                }
            });
        }

        // Перехватываем запуск видео и торрентов через Lampa.Player.play
        if (Lampa.Player && Lampa.Player.play && !Lampa.Player.__native_patched) {
            Lampa.Player.__native_patched = true;
            var origPlay = Lampa.Player.play;

            Lampa.Player.play = function (object) {
                try {
                    if (object) {
                        var videoUrl = object.url;

                        if (videoUrl && typeof videoUrl === 'object') {
                            if (Array.isArray(videoUrl)) {
                                videoUrl = videoUrl[0];
                            } else {
                                var keys = Object.keys(videoUrl);
                                if (keys.length) videoUrl = videoUrl[keys[0]];
                            }
                        }

                        if (typeof videoUrl === 'string' && videoUrl.length > 0) {
                            // Проверяем, запущен ли торрент (TorrServer) или обычный онлайн-поток
                            var isTorrent = Boolean(
                                object.torrent_hash ||
                                object.need_check_torrent ||
                                videoUrl.indexOf('/stream/') !== -1 ||
                                videoUrl.indexOf('link=') !== -1 ||
                                videoUrl.indexOf(':8090') !== -1
                            );

                            var playerMain = Lampa.Storage.get('player', 'inner');
                            var playerTorrent = Lampa.Storage.get('player_torrent', playerMain);
                            var activePlayer = isTorrent ? playerTorrent : playerMain;

                            if (activePlayer === 'nativeplayer') {
                                // Готовим прямую ссылку потока TorrServer
                                var cleanUrl = videoUrl.replace('&preload', '&play').replace(/\s/g, '%20');
                                var encodedUrl = encodeURIComponent(cleanUrl);

                                // Используем x-callback-url схему со скриншота для возврата в Лампу после просмотра
                                var deepLink = 'nativeplayer://x-callback-url/play?url=' + encodedUrl;

                                window.location.assign(deepLink);
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.error('NativePlayer play error:', err);
                }

                return origPlay.apply(this, arguments);
            };
        }
    }

    if (window.appready) {
        startPlugin();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    } else {
        var timer = setInterval(function () {
            if (window.Lampa && Lampa.Listener) {
                clearInterval(timer);
                if (window.appready) startPlugin();
                else Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') startPlugin();
                });
            }
        }, 200);
    }
})();
