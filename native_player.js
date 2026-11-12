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

    // Вспомогательная функция: эмуляция клика по <a target="_blank"> для WebKit
    function openViaAnchor(url, target) {
        var a = document.createElement('a');
        a.setAttribute('href', url);
        if (target) a.setAttribute('target', target);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            if (a.parentNode) a.parentNode.removeChild(a);
        }, 500);
    }

    function launchNativePlayer(videoUrl, title) {
        var cleanUrl = videoUrl.replace('&preload', '&play').replace(/\s/g, '%20');
        var encodedUrl = encodeURIComponent(cleanUrl);
        var encodedTitle = title ? '&title=' + encodeURIComponent(title) : '';

        // 4 варианта формирования и вызова Deep Link для проверки WebView на tvOS
        var linkSimpleEncoded = 'nativeplayer://play?url=' + encodedUrl + encodedTitle;
        var linkSimpleRaw = 'nativeplayer://play?url=' + cleanUrl;
        var linkCallbackEncoded = 'nativeplayer://x-callback-url/play?url=' + encodedUrl + encodedTitle;

        Lampa.Select.show({
            title: 'Способ запуска Native Player',
            items: [
                {
                    title: '1. Клик <a> (_blank) + Simple URL (Рекомендуется)',
                    subtitle: linkSimpleEncoded.substring(0, 60) + '...',
                    action: function () {
                        openViaAnchor(linkSimpleEncoded, '_blank');
                    }
                },
                {
                    title: '2. window.open + Simple URL',
                    subtitle: 'Открытие через новое окно WebKit',
                    action: function () {
                        window.open(linkSimpleEncoded, '_blank');
                    }
                },
                {
                    title: '3. Клик <a> + Прямой URL (без encodeURIComponent)',
                    subtitle: linkSimpleRaw.substring(0, 60) + '...',
                    action: function () {
                        openViaAnchor(linkSimpleRaw, '_blank');
                    }
                },
                {
                    title: '4. Клик <a> + x-callback-url',
                    subtitle: linkCallbackEncoded.substring(0, 60) + '...',
                    action: function () {
                        openViaAnchor(linkCallbackEncoded, '_blank');
                    }
                }
            ],
            onSelect: function (item) {
                Lampa.Controller.toggle('content');
                setTimeout(function () {
                    item.action();
                }, 100);
            },
            onBack: function () {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function startPlugin() {
        if (window.lampa_native_player_plugin) return;
        window.lampa_native_player_plugin = true;

        registerPlayerOption();

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
                } catch (e) {}
                return origSelectShow.apply(this, arguments);
            };
        }

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
                                launchNativePlayer(videoUrl, object.title || '');
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
