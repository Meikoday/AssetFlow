import psutil
import wmi
import requests
import sys
import json
import socket
from datetime import datetime
import time

def get_system_info():
    try:
        c = wmi.WMI()
        system_info = {}

        # CPU信息
        for cpu in c.Win32_Processor():
            system_info['cpu'] = {
                'model': cpu.Name.strip(),
                'cores': psutil.cpu_count(logical=False),
                'threads': psutil.cpu_count(logical=True)
            }
            break

        # 主板信息
        for board in c.Win32_BaseBoard():
            system_info['motherboard'] = {
                'manufacturer': board.Manufacturer,
                'model': board.Product,
                'serial': board.SerialNumber
            }
            break

        # 自动检测显示器信息
        system_info['monitors'] = []
        # 尝试使用WMI获取显示器信息
        try:
            for monitor in c.Win32_DesktopMonitor():
                if monitor.DeviceID and monitor.Name:
                    monitor_info = {
                        'model': monitor.Name.strip(),
                        'manufacturer': monitor.MonitorManufacturer if hasattr(monitor, 'MonitorManufacturer') else '',
                        'size': '',
                        'resolution': f"{monitor.ScreenWidth}x{monitor.ScreenHeight}" if monitor.ScreenWidth and monitor.ScreenHeight else ''
                    }
                    system_info['monitors'].append(monitor_info)
        except Exception as e:
            print(f"无法自动检测显示器信息: {str(e)}")
            # 出错时不添加任何显示器信息，将由用户手动输入

        # 内存信息
        memory = psutil.virtual_memory()
        system_info['memory'] = {
            'total': f"{memory.total / (1024**3):.1f}GB",
            'slots': []
        }
        for mem in c.Win32_PhysicalMemory():
            system_info['memory']['slots'].append({
                'size': f"{int(int(mem.Capacity) / (1024**3))}",
                'type': mem.MemoryType,
                'speed': mem.Speed,
                'manufacturer': mem.Manufacturer if mem.Manufacturer else 'Unknown'
            })

        # 硬盘信息
        system_info['disks'] = []
        for disk in c.Win32_DiskDrive():
            if disk.Size:  # 确保磁盘大小不为空
                system_info['disks'].append({
                    'model': disk.Model.strip(),
                    'size': f"{float(disk.Size) / (1024**3):.1f}GB",
                    'interface': disk.InterfaceType,
                    'serial': disk.SerialNumber.strip() if disk.SerialNumber else 'Unknown'
                })

        # 显卡信息
        system_info['gpus'] = []
        for gpu in c.Win32_VideoController():
            if gpu.Name:  # 确保显卡名称不为空
                system_info['gpus'].append({
                    'model': gpu.Name.strip(),
                    'memory': f"{float(gpu.AdapterRAM if gpu.AdapterRAM else 0) / (1024**3):.1f}GB",
                    'driver': gpu.DriverVersion,
                    'resolution': f"{gpu.CurrentHorizontalResolution}x{gpu.CurrentVerticalResolution}" if gpu.CurrentHorizontalResolution else 'Unknown'
                })

        # 操作系统信息
        for os in c.Win32_OperatingSystem():
            system_info['os'] = {
                'name': os.Caption,
                'version': os.Version,
                'architecture': os.OSArchitecture,
                'install_date': os.InstallDate,
                'last_boot': os.LastBootUpTime,
                'registered_user': os.RegisteredUser
            }
            break

        return system_info

    except Exception as e:
        print(f"错误：采集系统信息时出现异常 - {str(e)}")
        raise

def get_local_hostname():
    """获取本机计算机名"""
    try:
        return socket.gethostname()
    except:
        return "未知主机名"

def get_all_local_ips():
    """获取所有本地IP地址"""
    ip_list = []
    try:
        # 获取所有网络接口
        for interface_name, interface_addresses in psutil.net_if_addrs().items():
            for address in interface_addresses:
                # 只获取IPv4地址，忽略回环地址127.0.0.1
                if address.family == socket.AF_INET and address.address != '127.0.0.1':
                    # 检查是否可能是虚拟网卡
                    is_virtual = False
                    # 如果IP以.1结尾，可能是虚拟网卡或网关
                    if address.address.endswith('.1'):
                        is_virtual = True
                    
                    # 检查网卡名称是否包含虚拟网卡关键词
                    virtual_keywords = ['vmware', 'virtual', 'virtualbox', 'docker', 'hyper-v', 'mihomo']
                    for keyword in virtual_keywords:
                        if keyword in interface_name.lower():
                            is_virtual = True
                            break
                    
                    # 检查是否可能是物理网卡
                    is_physical = False
                    physical_keywords = ['ethernet', '以太网', 'wlan', 'wi-fi', '无线网络', 'lan']
                    for keyword in physical_keywords:
                        if keyword in interface_name.lower():
                            is_physical = True
                            break
                    
                    ip_list.append({
                        'address': address.address,
                        'interface': interface_name,
                        'is_virtual': is_virtual,
                        'is_physical': is_physical
                    })
    except Exception as e:
        print(f"警告：获取IP地址时出错 - {str(e)}")
    
    return ip_list

def get_recommended_addresses():
    """获取服务器推荐地址"""
    try:
        # 获取本地计算机名和IP地址
        hostname = get_local_hostname()
        ip_list = get_all_local_ips()
        
        # 对IP地址进行排序，优先推荐物理网卡
        ip_list.sort(key=lambda x: (not x['is_physical'], x['is_virtual']))
        
        recommendations = []
        
        # 首先添加物理网卡地址
        physical_ips = [ip['address'] for ip in ip_list if ip['is_physical'] and not ip['is_virtual']]
        if physical_ips:
            recommendations.extend(physical_ips)
        
        # 然后添加不确定类型的地址
        other_ips = [ip['address'] for ip in ip_list if not ip['is_physical'] and not ip['is_virtual']]
        if other_ips:
            recommendations.extend(other_ips)
        
        # 最后添加可能是虚拟网卡的地址
        virtual_ips = [ip['address'] for ip in ip_list if ip['is_virtual']]
        
        # 添加localhost和hostname
        all_recommendations = ["localhost", hostname] + recommendations
        
        # 去除重复项
        return list(dict.fromkeys(all_recommendations))
    except:
        return ["localhost"]

def test_server_connection(server_url):
    """测试服务器连接"""
    try:
        response = requests.get(f"{server_url}/api/assets", timeout=3)
        return True
    except:
        return False

def main():
    try:
        print("\n====== 电脑资产管理系统 - 资产信息采集工具 ======\n")
        print("此工具将采集电脑硬件信息并上传到资产管理服务器。\n")
        
        # 从控制台获取资产名称
        asset_name = input("请输入资产名称: ").strip()
        if not asset_name:
            print("错误：资产名称不能为空")
            sys.exit(1)

        # 获取系统信息（包含自动检测的显示器）
        print("\n正在采集系统信息...")
        system_info = get_system_info()
        system_info['name'] = asset_name
        
        # 显示当前检测到的显示器
        if system_info['monitors'] and len(system_info['monitors']) > 0:
            print("\n自动检测到以下显示器:")
            for i, monitor in enumerate(system_info['monitors']):
                print(f"[{i+1}] {monitor['model']} {monitor['resolution']}")
        else:
            print("\n未自动检测到显示器信息")
        
        # 询问是否需要手动添加或修改显示器信息
        modify_monitors = input("\n是否需要手动添加或修改显示器信息? (Y/N): ").strip().upper()
        
        if modify_monitors == "Y":
            system_info['monitors'] = []  # 清空自动检测的显示器
            
            while True:
                print("\n--- 添加显示器信息 ---")
                monitor_model = input("请输入显示器型号 (留空结束添加): ").strip()
                if not monitor_model:
                    break
                    
                monitor_size = input("请输入显示器尺寸 (例如：24英寸): ").strip()
                monitor_resolution = input("请输入显示器分辨率 (例如：1920x1080): ").strip()
                monitor_manufacturer = input("请输入显示器制造商: ").strip()
                
                system_info['monitors'].append({
                    'model': monitor_model,
                    'size': monitor_size,
                    'resolution': monitor_resolution,
                    'manufacturer': monitor_manufacturer
                })
                
                print(f"已添加显示器: {monitor_model}")
                
                if len(system_info['monitors']) > 0:
                    another = input("\n是否继续添加显示器? (Y/N): ").strip().upper()
                    if another != "Y":
                        break
        
        # 直接让用户输入服务器地址
        server_host = input("\n请输入服务器地址 (例如：192.168.1.100): ").strip()
        if not server_host:
            print("错误：服务器地址不能为空")
            sys.exit(1)
        
        server_url = f"http://{server_host}"
        # 如果用户没有提供端口，自动添加默认端口
        if ":" not in server_host:
            server_url = f"{server_url}:80"
            
        print(f"\n正在连接服务器 {server_url}...")
        if not test_server_connection(server_url):
            print("\n⚠️ 警告：无法连接到服务器，但将继续尝试上传数据。")
            retry = input("是否继续？(Y/N): ").strip().upper()
            if retry != "Y":
                print("操作已取消。")
                sys.exit(0)

        system_info['createdAt'] = datetime.utcnow().isoformat() + 'Z'

        print("\n采集完成，正在发送到服务器...")

        # 发送到服务器
        try:
            response = requests.post(
                f'{server_url}/api/assets',
                json=system_info,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )

            if response.status_code == 201:
                print("\n✓ 资产信息已成功上传")
                print("\n资产信息摘要:")
                print(f"- 名称: {asset_name}")
                print(f"- CPU: {system_info['cpu']['model']}")
                print(f"- 内存: {system_info['memory']['total']}")
                print(f"- 系统: {system_info['os']['name']}")
                print(f"- 显示器数量: {len(system_info['monitors'])}")
                
                # 显示如何在管理界面查看此资产
                print(f"\n您可以在资产管理界面查看此资产的完整信息：")
                print(f"   {server_url}")
            else:
                print(f"\n× 上传失败: HTTP {response.status_code}")
                print(f"错误信息: {response.text}")
        except requests.exceptions.ConnectionError:
            print("\n× 连接服务器失败，请确保服务器地址正确且服务器正在运行")
            print("\n可能的原因：")
            print("1. 服务器未启动")
            print("2. 服务器地址错误")
            print("3. 防火墙阻止了连接")
            print("4. 网络连接问题")
        except Exception as e:
            print(f"\n× 上传过程中发生错误: {str(e)}")

        # 等待用户按键后退出
        input("\n按回车键退出程序...")

    except KeyboardInterrupt:
        print("\n\n操作已取消。")
    except Exception as e:
        print(f"\n× 发生错误: {str(e)}")
        input("\n按回车键退出程序...")

if __name__ == '__main__':
    main()