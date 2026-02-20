<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead

        <!-- Translate.js - 作为全局脚本加载 -->
        <script src="{{ asset('js/translate.js') }}"></script>

        <!-- Translate.js 初始化 -->
        <script>
            // 使用延时初始化，确保 translate 对象完全加载
            setTimeout(function() {
                console.log('检查 translate 对象:', {
                    windowTranslate: typeof window.translate,
                    translate: typeof translate
                });

                window.translateLoaded = true;

                if (typeof window.translate !== 'undefined' && window.translate !== null) {
                    try {
                        // 设置本地语言为英文（假设文章是英文的）
                        window.translate.language.setLocal('english');
                        window.translate.selectLanguageTag.show = false;
                        window.translateReady = true;
                        console.log('Translate.js 初始化成功');
                    } catch (error) {
                        console.error('Translate.js 初始化失败:', error);
                        window.translateReady = false;
                    }
                } else if (typeof translate !== 'undefined' && translate !== null) {
                    // 如果 translate 不是在 window 上，尝试将其挂载到 window
                    window.translate = translate;
                    window.translateLoaded = true;
                    try {
                        // 设置本地语言为英文
                        window.translate.language.setLocal('english');
                        window.translate.selectLanguageTag.show = false;
                        window.translateReady = true;
                        console.log('Translate.js 初始化成功（从全局变量挂载）');
                    } catch (error) {
                        console.error('Translate.js 初始化失败:', error);
                        window.translateReady = false;
                    }
                } else {
                    console.error('Translate.js 未正确加载');
                    window.translateReady = false;
                }
            }, 100);
        </script>
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
