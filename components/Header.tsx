'use client';

import { Bell, Search, User, GitBranch } from 'lucide-react';

// バージョン情報
const VERSION = process.env.NEXT_PUBLIC_VERSION || '2.0.0';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString().slice(0, 19).replace('T', ' ');

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <div className="max-w-lg w-full lg:max-w-xs">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  className="input pl-10"
                  placeholder="商品を検索..."
                  type="search"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* バージョン情報 */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg border">
              <GitBranch className="h-4 w-4 text-gray-500" />
              <div className="text-xs">
                <span className="font-medium text-gray-700">v{VERSION}</span>
                <div className="text-gray-500" title={`ビルド時間: ${BUILD_TIME}`}>
                  {BUILD_TIME.split(' ')[0]}
                </div>
              </div>
            </div>
            
            <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">管理者</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}