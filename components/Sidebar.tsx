'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  DollarSign, 
  Filter,
  Settings,
  BarChart3,
  UserX,
  FileText
} from 'lucide-react';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: '商品一覧', href: '/products', icon: Package },
  { name: 'CSV出力', href: '/csv-export', icon: FileText },
  { name: '価格表管理', href: '/price-tables', icon: DollarSign },
  { name: 'キーワードフィルター', href: '/filters', icon: Filter },
  { name: 'NG出品者管理', href: '/ng-sellers', icon: UserX },
  { name: '分析', href: '/analytics', icon: BarChart3 },
  { name: '設定', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center">
          <div className="text-2xl">📊</div>
          <div className="ml-3">
            <div className="text-lg font-semibold text-gray-900">リサーチツール</div>
            <div className="text-sm text-gray-500">管理画面</div>
          </div>
        </div>
      </div>
      
      <nav className="px-3 pb-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}