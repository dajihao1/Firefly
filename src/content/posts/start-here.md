---
title: 手把手教你搭建中转站 VPS+CLI Proxy API（CPA）+NEW API+Docker+Nginx+Cloudflare+SSL+域名配置
published: 2026-07-02
description: >-
  本教程需要的技术（版本仅作为参考）：

  VPS（云服务器）（地区选择：硅谷）：2c2g（2个CPU核数2G的内存）

  Linux：CentOS Linux release 7.6.1810 (Core)

  docker：26.1.4

  docker-compose：2.27.1

  CLI Proxy API（CPA）：latest（v6.10.9
  ）（本教程会用newapi作为token监控和代理节点，cpa只是作为newapi的一个渠道使用和用于管理认证文件，所以用最新的版本即可）

  NEW API：latest（v1.0.0-rc.4）

  Nginx：latest（1.29.8）


  本教程需要的工具：

  FinalShell：SSH远程连接工具
sourceLink: https://linux.do/t/topic/2140889
category: 教程
tags:
  - Linux.do、VPS、CPA、New API、Cloudflare
pinned: true
draft: false
comment: false
---
## [](https://linux.do/t/topic/2140889#p-17651625-h-1)前提

> 非常感谢各位佬友对我之前文章的认可，既然大家对此类的文章比较感兴趣，恰巧我也研究过，所以继续给大家带来一个搭建中转站的教程
> 
> 该文章不会着重的讲解CPA的使用，有兴趣的佬友可以看我的这篇文章：[拒绝token焦虑 cpa（CLI Proxy API）反代 chatgpt（Codex） 保姆级全图文教程 - 开发调优 - LINUX DO](https://linux.do/t/topic/2120257)
> 
> 本教程需要的技术（版本仅作为参考）：
> 
> **VPS（云服务器）（地区选择：硅谷）**：2c2g（2个CPU核数2G的内存）
> 
> **Linux**：CentOS Linux release 7.6.1810 (Core)
> 
> **docker**：26.1.4
> 
> **docker-compose**：2.27.1
> 
> **CLI Proxy API（CPA）**：latest（v6.10.9 ）（本教程会用newapi作为token监控和代理节点，cpa只是作为newapi的一个渠道使用和用于管理认证文件，所以用最新的版本即可）
> 
> **NEW API**：latest（v1.0.0-rc.4）
> 
> **Nginx**：latest（1.29.8）
> 
> 本教程需要的工具：
> 
> **[FinalShell](https://www.hostbuf.com/)**：SSH远程连接工具

> 我买了腾讯云的服务器用来做教学，全程可用国内网访问
> 
> 有vps的佬可以跳过这一步了

## [](https://linux.do/t/topic/2140889#p-17651625-httpscloudtencentcomactissdk-topnav-3)活动页[腾讯云最新活动](https://cloud.tencent.com/act?Is=sdk-topnav)

> 这个为新人优惠，2c2g一年99米
> 
> 这是两个图片拼接起来的，颜色不同的大框表示不同的图片，这两个图片的截取在同一个页面，下滑即可

[![image](https://cdn3.ldstatic.com/optimized/4X/e/c/4/ec44713d232cf37e7f736500e1db205a5d8711e1_2_690x449.png)](https://cdn3.ldstatic.com/original/4X/e/c/4/ec44713d232cf37e7f736500e1db205a5d8711e1.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-h-4)购买完毕后进入控制台

> 这也是两张图片拼接起来的，颜色不同的大框表示不同的图片，上面黄框是腾讯云的主页的头部标签，下面红框是点击控制台后进入控制台的页面

[![image](https://cdn3.ldstatic.com/optimized/4X/e/a/5/ea5302c9721de4684911886bf23bc2c96c48d0af_2_690x235.png)](https://cdn3.ldstatic.com/original/4X/e/a/5/ea5302c9721de4684911886bf23bc2c96c48d0af.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-ip-5)查看服务器ip

> 也是由黄框和红框分别不同的图片
> 
> 由于腾讯云默认安全组打开了22端口（SSH服务），这里就不进安全组了，后文有讲到如何配置安全组，这里不过多赘述

[![image](https://cdn3.ldstatic.com/optimized/4X/5/d/f/5df862c7070dc75d0b42cf02a242e51fdd230f92_2_690x223.png)](https://cdn3.ldstatic.com/original/4X/5/d/f/5df862c7070dc75d0b42cf02a242e51fdd230f92.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-finalshell-6)使用FinalShell连接到服务器

> 填写名称、主机ip、用户名和密码即可连接到我们的服务器
> 
> FinalShell的好处就是修改文件或者上传下载文件时是可视化的，不用一遍一遍敲命令行

[![image](https://cdn3.ldstatic.com/optimized/4X/b/9/c/b9c3cf5162ff7decddccdfda399ae6fe00bafc84_2_690x378.png)](https://cdn3.ldstatic.com/original/4X/b/9/c/b9c3cf5162ff7decddccdfda399ae6fe00bafc84.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-h-7)对外中转站教程开始

## [](https://linux.do/t/topic/2140889#p-17651625-h-8)一、准备工作

### [](https://linux.do/t/topic/2140889#p-17651625-h-1-9)1、创建一个文件夹用于存文件，并进入该文件夹

> proxy：用于存放docker-compose.yml文件（启动文件夹）
> 
> cpa：用于存放cpa的配置文件（config.yaml）和其他的挂载卷信息（日志、Oauth认证文件）
> 
> newapi：用于存放new api的挂载卷信息（日志、配置文件）

```bash
mkdir -p /opt/proxy/{cpa/{logs,auths},newapi/{data,logs}} && cd /opt/proxy && touch docker-compose.yml cpa/config.yaml
```

> 执行上述命令后，我们就可以看到下面图片所示内容
> 
> newapi里面就不展示了，里面的文件是空的
> 
> 需要修改proxy文件夹中的docker-compose.yml和cpa目录下的config.yaml文件
> 
> 目录结构如下

```plaintext
/opt/proxy/
├── docker-compose.yml
├── cpa/
│   ├── logs/
│   ├── auths/
│   └── config.yaml
└── newapi/
    ├── data/
    └── logs/
```

[![image](https://cdn3.ldstatic.com/optimized/4X/a/7/d/a7de86914c525d25b2f83831c77a5bb596a5634a_2_690x368.png)](https://cdn3.ldstatic.com/original/4X/a/7/d/a7de86914c525d25b2f83831c77a5bb596a5634a.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-2cpa-configyaml-10)2、cpa目录下的 config.yaml 文件

> 包含![:warning:](https://cdn.ldstatic.com/images/emoji/twemoji/warning.png?v=15 ":warning:")的参数是需要修改的，包含![:red_question_mark:](https://cdn.ldstatic.com/images/emoji/twemoji/red_question_mark.png?v=15 ":red_question_mark:")的是可修改的，其他的可以照抄

```yaml
# 服务器绑定主机/接口，默认空字符串同时绑定 IPv4/IPv6  
# 使用 "127.0.0.1" 或 "localhost" 可限制仅本机访问  
host: ""  
# 服务器端口  
port: 8317  
tls:  
# 是否启用 HTTPS    
  enable: false  
# 管理 API 设置    
remote-management:  
# 是否允许远程（非 localhost）访问管理接口。  
# 为 false 时仅允许 localhost，仍需管理密钥。  
  allow-remote: true  
# 管理密钥。若填写明文，启动时会自动哈希后生效。  
# 所有管理请求（包括本地）都需要该密钥。  
# 留空则完全禁用管理 API（所有 /v0/management 路由返回 404）。  
  secret-key: "$2a$10$5dHykttqHWAU.WcYFg0qgOXhDoxC1P7wpZ7i2T8Kj9xqwvVRfTUm2"    # ⚠️ 请修改密码
# true 时禁用内置管理面板资源与路由。 默认 false  
  disable-control-panel: false  
# 认证目录（支持 ~ 展开为主目录）  
auth-dir: "~/.cli-proxy-api"  
# apikeys 自己设置  
api-keys:  
  - sk-8SGCShq021BAFgpBE  # ⚠️ 请修改秘钥
# 调试日志。 默认 false  
debug: true  
# 写入滚动日志文件而非 stdout。 默认false  
logging-to-file: true  
# 日志目录大小上限，0 表示不限制。  
logs-max-total-size-mb: 100  
# 403/408/500/502/503/504 时的重试次数。  
request-retry: 3  
# 冷却凭据等待秒数上限，超出即触发重试。  
max-retry-interval: 30  
routing:  
# 多匹配凭据的选择策略：round-robin 或 fill-first。 默认round-robin  
  strategy: "round-robin"  
# 是否为 /v1/ws 启用认证。 默认false  
ws-auth: false  
# 为 false 时禁用内存用量统计聚合，默认false  
# 1.10版本后失效，我这里用的最新版本，并且后续通过newapi统计，这里false即可  
# ❓ 如果选择cpa对外的话，并且参照我之前的文章，需要监控token消耗，这里可以改为true  
usage-statistics-enabled: false
```

### [](https://linux.do/t/topic/2140889#p-17651625-h-3proxy-docker-composeyml-11)3、proxy目录下的 docker-compose.yml 文件

> 包含![:warning:](https://cdn.ldstatic.com/images/emoji/twemoji/warning.png?v=15 ":warning:")的参数是需要修改的，包含![:red_question_mark:](https://cdn.ldstatic.com/images/emoji/twemoji/red_question_mark.png?v=15 ":red_question_mark:")的是可修改的，其他的可以照抄

```yaml
# newapi docker-compose 配置参考：  
# https://docs.newapi.ai/zh/docs/installation/config-maintenance/docker-compose-yml  
# 启动的全部服务  
services:
# 服务名  
  new-api:
# 镜像名  
    image: calciumion/new-api:latest
# 容器名  
    container_name: new-api
# 退出时总是自动重启，确保服务意外挂掉后能恢复。  
    restart: always
# 启动容器后，会执行这个自定义命令，它将应用的日志目录设置为 /app/logs
    command: --log-dir /app/logs
# 端口映射
    ports:  
      - '3000:3000'  # ❓注意后面的3000不能修改，不然后面的healthcheck心跳检测，检测不到  
# 卷挂载  
    volumes:  
      - ./newapi/data:/data  
      - ./newapi/logs:/app/logs  
# 环境变量  
    environment:  
      - SQL_DSN=postgresql://root:123456@postgres:5432/new-api # ⚠️ 请修改密码  
#      - SQL_DSN=root:123456@tcp(mysql:3306)/new-api  # 如果用mysql的话，取消这条注释，并注释上面那条  
      - REDIS_CONN_STRING=redis://redis  
# 设置容器时区为上海  
      - TZ=Asia/Shanghai  
# 是否启用错误日志记录  
      - ERROR_LOG_ENABLED=true  
# 是否启用批量更新 batch update enabled  
      - BATCH_UPDATE_ENABLED=true  
#      - STREAMING_TIMEOUT=300  # 流模式无响应超时时间，单位秒，默认120秒，如果出现空补全可以尝试改为更大值  
#      - SESSION_SECRET=random_string  # 多机部署时设置，必须修改这个随机字符串！！  
#      - SYNC_FREQUENCY=60  # 如果需要定期数据库同步，请取消注释  
# 定义启动顺序，它会等待 rpa、redis、postgres 容器启动后，再启动  
    depends_on:  
      - redis  
      - postgres  
#      - mysql  # 如果用mysql的话，取消这条注释，并注释上面那条  
      - cpa  
# 心跳检查，在容器内检查，间隔30s，超时时间10s，重复机制3次  
    healthcheck:  
# test的内容是向本机（容器内）发送一个请求，如果在响应中找不到success关键字就报错  
      test:  
        [  
          'CMD-SHELL',  
          "wget -q -O - http://localhost:3000/api/status | grep -o '\"success\":\\s*true' || exit 1",  
        ]  
      interval: 30s  
      timeout: 10s  
      retries: 3  
  
# 下面的同上，不同的参数我再做解释  
  redis:  
    image: redis:latest  
    container_name: redis  
    restart: always  
  
  postgres:  
    image: postgres:15  
    container_name: postgres  
    restart: always  
    environment:  
# 数据库用户名  
      POSTGRES_USER: root # ❓ 设置用户名，改为你自己的  
# 数据库密码  
      POSTGRES_PASSWORD: 123456 # ⚠️ 设置密码，改为你自己的  
# 数据库名  
      POSTGRES_DB: new-api  
    volumes:  
      - pg_data:/var/lib/postgresql/data  
#    ports:  
#      - "5432:5432"  # 如果这个服务要对外，需要解开这个注释  
  
#  mysql:  
#    image: mysql:8.2  
#    container_name: mysql  
#    restart: always  
#    environment:  
#      MYSQL_ROOT_PASSWORD: 123456  # ⚠️ 设置密码，改为你自己的  
#      MYSQL_DATABASE: new-api  
#    volumes:  
#      - mysql_data:/var/lib/mysql  
#    ports:  
#      - "3306:3306"  # 如果这个服务要对外，需要解开这个注释  
  
# cpa服务  
  cpa:  
    image: eceasy/cli-proxy-api:latest  
    container_name: cpa  
 #   ports:    
 #     - "9999:8317" # ❓因为这次是通过newpai对外提供服务，cpa只是作为认证文件管理工具  
    volumes:    
      - ./cpa/config.yaml:/CLIProxyAPI/config.yaml # 配置文件输出    
      - ./cpa/auths:/root/.cli-proxy-api # 认证文件 config.yaml 中的 ~ 代表主目录，在linux中就是 /root    
      - ./cpa/logs:/CLIProxyAPI/logs # 日志文件输出    
    restart: always  
  
# 顶级挂载，避免文件权限问题，挂载地址：/var/lib/docker/volumes/pg_data  
volumes:  
  pg_data:  
#  mysql_data:
```

### [](https://linux.do/t/topic/2140889#p-17651625-h-4-optproxycpaauths-12)4、把认证文件放进 /opt/proxy/cpa/auths 目录下

[![image](https://cdn3.ldstatic.com/original/4X/f/0/8/f085b0d0c4305dd2a35a5d6a7e51fda8b4c4a0b4.png)](https://cdn3.ldstatic.com/original/4X/f/0/8/f085b0d0c4305dd2a35a5d6a7e51fda8b4c4a0b4.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-5linux3000-13)5、去Linux的防火墙打开3000端口

先查看下防火墙状态

```bash
# 看防火墙是否在运行
systemctl status firewalld
# 启动防火墙（不会断 SSH，放心）
systemctl start firewalld
# 设置开机自启
systemctl enable firewalld
# 看看当前默认放行了哪些服务
firewall-cmd --list-services
# 看开放了哪些端口
firewall-cmd --list-ports
```

如果防火墙没有开启，则不用执行下面的步骤，或者你要安全可以打开防火墙后执行下面命令

打开后后续如果要对外开放端口都需要重新配置一遍

比如你只想用cpa对外，就需要修改 --add-port 为你自己的参数

```bash
firewall-cmd --zone=public --add-port=3000/tcp --permanent && firewall-cmd --reload && firewall-cmd --list-ports
```

比如下面我的操作就说明可以了（供参考）：

```bash
[root@VM-0-16-centos proxy]# firewall-cmd --zone=public --add-port=3000/tcp --permanent && firewall-cmd --reload && firewall-cmd --list-ports
success
success
3000/tcp
[root@VM-0-16-centos proxy]# firewall-cmd --list-ports
3000/tcp
```

### [](https://linux.do/t/topic/2140889#p-17651625-h-6-14)6、打开云服务器的安全组

> 我用的是腾讯云的vps，这里用腾讯云举例，其他的也是大同小异

#### [](https://linux.do/t/topic/2140889#p-17651625-h-1-15)（1、先去控制台进入选择我们的服务器

[![image](https://cdn3.ldstatic.com/optimized/4X/d/1/8/d1831b90e4cd7ad8422acb6b6989836b8fe1ffe6_2_625x500.png)](https://cdn3.ldstatic.com/original/4X/d/1/8/d1831b90e4cd7ad8422acb6b6989836b8fe1ffe6.png "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-2ssh22-16)（2、选择防火墙并添加规则，下面三个是官方配置的，不要动，特别是SSH登录（22端口）

[![image](https://cdn3.ldstatic.com/optimized/4X/f/4/d/f4d27a3d5af90b6e6ee14f13c3d78cb7985fa5bf_2_690x247.png)](https://cdn3.ldstatic.com/original/4X/f/4/d/f4d27a3d5af90b6e6ee14f13c3d78cb7985fa5bf.png "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-3-17)（3、添加规则：配置来源和端口号

[![image](https://cdn3.ldstatic.com/optimized/4X/6/4/a/64a95b16f3502348c530084e86169f409c73095a_2_690x252.png)](https://cdn3.ldstatic.com/original/4X/6/4/a/64a95b16f3502348c530084e86169f409c73095a.png "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-4-18)（4、确认好后就多了一条

[![image](https://cdn3.ldstatic.com/optimized/4X/e/b/4/eb4842802eb602b072b077c4f0c0a0b628ff6f79_2_690x291.png)](https://cdn3.ldstatic.com/original/4X/e/b/4/eb4842802eb602b072b077c4f0c0a0b628ff6f79.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-docker-compose-19)二、执行docker compose文件

> 在 /opt/proxy 目录下（你的 docker-compose.yml 文件所在目录）
> 
> 执行命令 `docker compose up -d` 即可

```bash
[root@VM-0-16-centos proxy]# docker compose up -d
WARN[0000] /opt/proxy/docker-compose.yml: `version` is obsolete 
[+] Running 27/10
 ✔ redis Pulled                                                                                                                                    8.2s 
 ✔ postgres Pulled                                                                                                                                26.0s 
 ✔ new-api Pulled                                                                                                                                 27.3s 
[+] Running 6/6
 ✔ Network proxy_default   Created                                                                                                                 0.1s 
 ✔ Volume "proxy_pg_data"  Created                                                                                                                 0.0s 
 ✔ Container cpa           Started                                                                                                                 0.8s 
 ✔ Container postgres      Started                                                                                                                 0.7s 
 ✔ Container redis         Started                                                                                                                 0.8s 
 ✔ Container new-api       Started 
```

## [](https://linux.do/t/topic/2140889#p-17651625-psdocker-compose-20)PS：关闭docker compose后重启报错

> 关闭docker compose命令

```bash
docker compose down
```

> 我重启时遇见了下面的问题
> 
> 这里只需要重启docker再启动docker compose即可
> 
> 重启docker：`systemctl restart docker`
> 
> 启动docker compose：`docker compose up -d`

```bash
[root@VM-0-16-centos proxy]# docker compose up -d WARN[0000] /opt/proxy/docker-compose.yml: `version` is obsolete [+] Running 1/0 ✘ Network proxy_default Error 0.0s failed to create network proxy_default: Error response from daemon: Failed to Setup IP tables: Unable to enable SKIP DNAT rule: (iptables failed: iptables --wait -t nat -I DOCKER -i br-b977b99684c8 -j RETURN: iptables: No chain/target/match by that name. (exit status 1))
```

## [](https://linux.do/t/topic/2140889#p-17651625-httpip3000-21)三、我们通过 [http://ip:3000](http://ip:3000/) 就可以访问我们中转站了

[![image](https://cdn3.ldstatic.com/optimized/4X/f/8/5/f85e2fded889f2d445af9b7e6fc341f5158f57b2_2_690x324.png)](https://cdn3.ldstatic.com/original/4X/f/8/5/f85e2fded889f2d445af9b7e6fc341f5158f57b2.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-newapi-22)四、newapi配置

### [](https://linux.do/t/topic/2140889#p-17651625-h-1-23)1、登录

> 我们通过管理员登录，就可以看见只有管理员才能看见的菜单了
> 
> 而这些菜单就是对关键的配置
> 
> 我这里只讲一下几个关键菜单配置
> 
> 这些菜单也只是挑重点讲一下，最后能使用即可，如果自用或者公益站这些足以，如果商用就得自己下功夫去看官网文档，或者把源码下载下来二次开发了
> 
> 如果感兴趣可以去官网查看文档，写的很详细：[渠道管理 | New API](https://docs.newapi.pro/zh/docs/guide/feature-guide/admin/channel)

### [](https://linux.do/t/topic/2140889#p-17651625-h-2-24)2、渠道管理

[![image](https://cdn3.ldstatic.com/optimized/4X/a/6/c/a6cadc5ea4dbfabd35d7c86eccb581a074ce11ac_2_690x318.png)](https://cdn3.ldstatic.com/original/4X/a/6/c/a6cadc5ea4dbfabd35d7c86eccb581a074ce11ac.png "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-25)添加渠道

> 这里填写我们cpa配置的apikey和docker compose配置的服务名（因为在同一个docker compose文件中，他们共享同一个docker网络）
> 
> 名称：随意
> 
> 秘钥：cpa中config.yaml配置的秘钥
> 
> API地址（放个可以复制粘贴的：[http://cpa:8317](http://cpa:8317/)）：就是cpa的地址
> 
> 模型：秘钥和api地址填好后点击获取即可

[![image](https://cdn3.ldstatic.com/optimized/4X/e/8/3/e83fdf57c49fc9ab6be183285584dc79342e3dfb_2_690x435.png)](https://cdn3.ldstatic.com/original/4X/e/8/3/e83fdf57c49fc9ab6be183285584dc79342e3dfb.png "image")

点击测试后发现报错，我们就根据报错提示去配置价格

[![image](https://cdn3.ldstatic.com/optimized/4X/b/b/1/bb15b7ca8fb202dd6d87528a3abbb3393eec940f_2_690x149.png)](https://cdn3.ldstatic.com/original/4X/b/b/1/bb15b7ca8fb202dd6d87528a3abbb3393eec940f.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-3-26)3、系统管理

#### [](https://linux.do/t/topic/2140889#p-17651625-h-27)设置模型价格

[![image](https://cdn3.ldstatic.com/optimized/4X/d/d/2/dd244e9a803c2e993a5b319c8a32e4d030b6455d_2_690x288.png)](https://cdn3.ldstatic.com/original/4X/d/d/2/dd244e9a803c2e993a5b319c8a32e4d030b6455d.png "image")

我们再去点击测试，发现就可以通过了

[![image](https://cdn3.ldstatic.com/optimized/4X/5/e/f/5ef1e33731c76f6dfce55b1d523ee4b27814d618_2_690x140.png)](https://cdn3.ldstatic.com/original/4X/5/e/f/5ef1e33731c76f6dfce55b1d523ee4b27814d618.png "image")

在模型广场里面也可以看见我们配置的模型了

[![image](https://cdn3.ldstatic.com/optimized/4X/b/0/0/b00fc30821499fe0e51df1db7d8d5f5a61772dd6_2_690x226.jpeg)](https://cdn3.ldstatic.com/original/4X/b/0/0/b00fc30821499fe0e51df1db7d8d5f5a61772dd6.jpeg "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-28)其他

系统设置里面有很多功能，比如修改可见菜单

[![image](https://cdn3.ldstatic.com/optimized/4X/0/1/c/01c5c5e7e6f5b17e6f88d86154e37fc21807a7c7_2_690x296.png)](https://cdn3.ldstatic.com/original/4X/0/1/c/01c5c5e7e6f5b17e6f88d86154e37fc21807a7c7.png "image")

设置签到功能

[![image](https://cdn3.ldstatic.com/optimized/4X/d/1/9/d19d05f8baade5ab378a7aede3fc00d0743fbc26_2_690x190.png)](https://cdn3.ldstatic.com/original/4X/d/1/9/d19d05f8baade5ab378a7aede3fc00d0743fbc26.png "image")

设置公告、api信息、支付等等

[![image](https://cdn3.ldstatic.com/optimized/4X/9/8/0/9807c17a53a4b673ae27b910dc9ef3a1d01efc14_2_690x283.png)](https://cdn3.ldstatic.com/original/4X/9/8/0/9807c17a53a4b673ae27b910dc9ef3a1d01efc14.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-4-29)4、配置令牌

[![image](https://cdn3.ldstatic.com/optimized/4X/f/c/8/fc81e0e507c22f149c55887ddacc551ef928c218_2_690x415.png)](https://cdn3.ldstatic.com/original/4X/f/c/8/fc81e0e507c22f149c55887ddacc551ef928c218.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-5cc-switch-30)5、本地连接测试（CC Switch）

> 配置一下刚才我们复制的秘钥

[![image](https://cdn3.ldstatic.com/optimized/4X/b/1/0/b103b4714b692b363bf12c53368dde71f9e5664b_2_690x460.png)](https://cdn3.ldstatic.com/original/4X/b/1/0/b103b4714b692b363bf12c53368dde71f9e5664b.png "image")

> 测试一下，没有问题

[![image](https://cdn3.ldstatic.com/optimized/4X/e/1/2/e124b46a15a2ce5b9fd49aec3e1f49586f28e19f_2_690x284.png)](https://cdn3.ldstatic.com/original/4X/e/1/2/e124b46a15a2ce5b9fd49aec3e1f49586f28e19f.png "image")

> 在数据看板中也可以看见使用情况

[![image](https://cdn3.ldstatic.com/optimized/4X/1/9/6/1969c73c25299b0a27b3c61adf401c4d81827bf8_2_690x285.png)](https://cdn3.ldstatic.com/original/4X/1/9/6/1969c73c25299b0a27b3c61adf401c4d81827bf8.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-h-31)五、域名配置

> 这里可以很简单的配置一下DNS做映射，但不安全，所以我们这里添加一个项目nginx，用于添加SSL证书
> 
> 这里我使用的是**cloudflare**做的代理，所以我按cloudflare讲解，其他的云服务商配置也是大同小异
> 
> **如果不想配置nginx和SSL，只想单纯的通过域名解析到IP，直接看第三步：配置DNS解析服务**
> 
> 我买的顶级域名为（严格来说这是二级域名，我习惯说这是顶级域名）：wudike.online
> 
> 需要创建一个二级域名来映射我的网站：api.wudike.online

### [](https://linux.do/t/topic/2140889#p-17651625-h-1-cloudflare-dns-32)1、使用 Cloudflare 的 DNS 代理我们的域名

> 这里的域名是我之前买的，在阿里云上的，所以我用阿里云作为演示，各个云服务商的操作都是大同小异的

#### [](https://linux.do/t/topic/2140889#p-17651625-h-1-33)（1、进入域名与网站

[![image](https://cdn3.ldstatic.com/optimized/4X/a/4/b/a4b645883170ef54368e71cf03bed177305a7202_2_690x202.png)](https://cdn3.ldstatic.com/original/4X/a/4/b/a4b645883170ef54368e71cf03bed177305a7202.png "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-2-34)（2、选择域名进行购买

> 查询之后下滑点击购买就可以了
> 
> 域名这里买了之后要实名去备份，审核要几个工作日吧，有点忘记了

[![image](https://cdn3.ldstatic.com/optimized/4X/d/d/3/dd32775767e298a8af3ee89251fdac5f04a35e5b_2_690x196.png)](https://cdn3.ldstatic.com/original/4X/d/d/3/dd32775767e298a8af3ee89251fdac5f04a35e5b.png "image")

#### [](https://linux.do/t/topic/2140889#p-17651625-h-3cloudflarecloudflare-35)（3、登录Cloudflare，并交给Cloudflare托管

> ps：Cloudflare右上角人物头像那可以切换语言

##### [](https://linux.do/t/topic/2140889#p-17651625-h-36)①、添加域名

> 下面那个我已经注册了，上面已经有服务了，注销在注册太麻烦

[![image](https://cdn3.ldstatic.com/optimized/4X/8/e/6/8e66fa8975e53dd082fe0eb27de04b13dd025ec7_2_690x187.png)](https://cdn3.ldstatic.com/original/4X/8/e/6/8e66fa8975e53dd082fe0eb27de04b13dd025ec7.png "image")

##### [](https://linux.do/t/topic/2140889#p-17651625-h-37)②、跟着我的步骤点点就行了

[![image](https://cdn3.ldstatic.com/optimized/4X/2/2/2/22293d3e2ee6245636012d6165bcc452378b4183_2_690x378.png)](https://cdn3.ldstatic.com/original/4X/2/2/2/22293d3e2ee6245636012d6165bcc452378b4183.png "image")

> 上面四个步骤结束后我们得到了下面这个页面，需要去我们的云服务商重新配置一下DNS解析

[![image](https://cdn3.ldstatic.com/optimized/4X/8/0/3/803d312f78fcf8336f6c6bd2fef57105a7a5d1f2_2_690x409.png)](https://cdn3.ldstatic.com/original/4X/8/0/3/803d312f78fcf8336f6c6bd2fef57105a7a5d1f2.png "image")

##### [](https://linux.do/t/topic/2140889#p-17651625-h-38)③、我们去阿里云配置一下域名的解析

> 进入我们的工作台，点击域名就可以看到我们购买的域名了
> 
> [![image](https://cdn3.ldstatic.com/optimized/4X/e/4/e/e4ef819aa65dead9e6788b797ad7e16164622b2e_2_690x200.png)](https://cdn3.ldstatic.com/original/4X/e/4/e/e4ef819aa65dead9e6788b797ad7e16164622b2e.png "image")

> 进去之后我们就可以修改DNS代理了
> 
> 注： 国际域名最少填写2个，最多填写13个，国内域名最多填写6个。
> 
> 所以我们两个都要复制哦，把之前的替换掉

[![image](https://cdn3.ldstatic.com/optimized/4X/c/d/0/cd086b0dce8bab5fd62e45680b4cafe8c428861e_2_690x217.png)](https://cdn3.ldstatic.com/original/4X/c/d/0/cd086b0dce8bab5fd62e45680b4cafe8c428861e.png "image")

##### [](https://linux.do/t/topic/2140889#p-17651625-cloudflare-39)④、回到Cloudflare

> 下拉后，点击我已更新名称服务器
> 
> [![image](https://cdn3.ldstatic.com/optimized/4X/9/7/3/973980f9ad7532b95005fbbe132621b33ff14064_2_690x408.png)](https://cdn3.ldstatic.com/original/4X/9/7/3/973980f9ad7532b95005fbbe132621b33ff14064.png "image")

> 我们等十分钟后刷新一下
> 
> [![image](https://cdn3.ldstatic.com/original/4X/7/4/9/749db540c773cb466525ebbc765e2d8a5528b559.png)](https://cdn3.ldstatic.com/original/4X/7/4/9/749db540c773cb466525ebbc765e2d8a5528b559.png "image")

> 如果出现这样就代表成功了，由于我已经配置了一个域名，不想再去买一个配置了，下面这张图用的小黄大佬的图，大佬的文章我也贴在最后了

[![image](https://cdn3.ldstatic.com/optimized/4X/5/2/b/52bbd9ec98b6b16e5439926b1efec769c331fa70_2_690x413.png)](https://cdn3.ldstatic.com/original/4X/5/2/b/52bbd9ec98b6b16e5439926b1efec769c331fa70.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-2-nginx-40)2、添加 nginx 目录和文件

```bash
mkdir -p /opt/proxy/nginx/{ssl,logs,conf.d} && \
cd /opt/proxy && \
touch nginx/nginx.conf nginx/conf.d/api.conf nginx/ssl/api.pem nginx/ssl/api.key && \
chmod 600 ./nginx/ssl/api.key
```

> 执行上面命令，再结合上文的newapi和cpa目录，整体的目录树如下，这里主要讲nginx的东西，auth的json认证文件什么的就没画了

```plaintext
/opt/proxy/
├── docker-compose.yml          # docker compose 文件
├── newapi/                     # new-api 数据目录
│   ├── data/
│   └── logs/
├── cpa/                        # cpa 服务配置目录
│   ├── config.yaml
│   ├── auths/
│   └── logs/
└── nginx/                      # Nginx 相关文件
    ├── nginx.conf              # Nginx 主配置文件
    ├── conf.d/
    │   └── api.conf            # API 站点配置文件
    ├── ssl/
    │   ├── api.pem             # SSL 证书文件
    │   └── api.key             # SSL 私钥文件 (权限: 600)
    └── logs/                   # Nginx 日志目录
```

#### [](https://linux.do/t/topic/2140889#p-17651625-nginxconf-41)nginx.conf

> 这里不用修改，直接复制粘贴即可

```
user nginx;                                                      # 工作进程运行用户
worker_processes auto;                                           # 自动检测 CPU 核心数，设为对应进程数
error_log /var/log/nginx/error.log warn;                        # 错误日志路径及级别（warn）
pid /var/run/nginx.pid;                                         # 主进程 PID 存放文件

events {
    worker_connections 1024;                                     # 每个工作进程最大并发连接数
    use epoll;                                                   # 使用 Linux epoll 事件模型（高并发）
    multi_accept on;                                             # 同时接受多个新连接
}

http {
    include /etc/nginx/mime.types;                               # 引入 MIME 类型与文件扩展名映射
    default_type application/octet-stream;                       # 未知文件类型的默认 MIME

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"'; # 自定义日志格式，记录客户端 IP、时间、请求、状态等

    access_log /var/log/nginx/access.log main;                   # 访问日志路径，使用 main 格式

    sendfile on;                                                 # 开启高效文件传输模式
    tcp_nopush on;                                               # sendfile 开启时，将响应头和数据一起发送
    tcp_nodelay on;                                              # 对 keep-alive 连接禁用 Nagle 算法，降低延迟
    keepalive_timeout 65;                                        # keep-alive 连接超时秒数
    types_hash_max_size 2048;                                    # MIME 类型哈希表最大大小
    client_max_body_size 100m;                                   # 客户端请求体最大允许大小（上传限制）

    gzip on;                                                     # 启用 gzip 压缩
    gzip_vary on;                                                # 添加 Vary: Accept-Encoding 响应头
    gzip_min_length 1024;                                        # 只压缩超过 1KB 的响应
    gzip_comp_level 6;                                           # 压缩等级 1-9，6 是性能和压缩率的平衡点
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript
               application/xml+rss application/rss+xml
               font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;      # 需要压缩的 MIME 类型列表

    include /etc/nginx/conf.d/*.conf;                            # 加载站点单独配置文件（如 api.conf）
}
```

#### [](https://linux.do/t/topic/2140889#p-17651625-apiconf-42)api.conf

> 包含![:warning:](https://cdn.ldstatic.com/images/emoji/twemoji/warning.png?v=15 ":warning:")的参数是需要修改的，包含![:red_question_mark:](https://cdn.ldstatic.com/images/emoji/twemoji/red_question_mark.png?v=15 ":red_question_mark:")的是可修改的，其他的可以照抄

```
# ==================== HTTP 重定向到 HTTPS ====================
server {
    listen 80;                                                   # 监听 IPv4 80 端口
    server_name api.wudike.online;                               # ⚠️ 你的域名

    # 将所有 HTTP 请求永久重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

# ==================== HTTPS 主服务器 ====================
server {
    listen 443 ssl http2;                                        # 监听 IPv4 443 端口，开启 SSL 和 HTTP/2
    server_name api.wudike.online;                               # ⚠️ 你的域名

    ssl_certificate /etc/nginx/ssl/api.pem;                      # ❓名字可改 SSL 证书文件（含中间证书）
    ssl_certificate_key /etc/nginx/ssl/api.key;                  # ❓名字可改 SSL 私钥文件

    ssl_protocols TLSv1.2 TLSv1.3;                               # 只启用安全的 TLS 协议版本
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384; # 加密套件列表
    ssl_prefer_server_ciphers off;                               # 由客户端选择加密套件（兼容性更好）
    ssl_session_cache shared:SSL:10m;                            # 共享 SSL 会话缓存，提升 TLS 握手速度
    ssl_session_timeout 10m;                                     # SSL 会话缓存过期时间

    # 安全增强响应头
    add_header Strict-Transport-Security "max-age=63072000" always; # 启用 HSTS，强制浏览器使用 HTTPS
    add_header X-Frame-Options "SAMEORIGIN" always;              # 限制页面只能被同源网站嵌入
    add_header X-Content-Type-Options "nosniff" always;          # 禁止浏览器 MIME 类型嗅探
    add_header X-XSS-Protection "1; mode=block" always;          # 开启浏览器内置 XSS 过滤

    access_log /var/log/nginx/api-access.log main;               # 站点访问日志
    error_log /var/log/nginx/api-error.log;                      # 站点错误日志

    client_max_body_size 100m;                                   # 允许上传的最大请求体（API 数据可能较大）

    location / {
        proxy_pass http://new-api:3000;                          # ⚠️ 你的应用服务名
        proxy_http_version 1.1;                                  # 使用 HTTP/1.1 长连接

        # WebSocket 支持头（用于 OpenAI 流式接口等）
        proxy_set_header Upgrade $http_upgrade;                  # 传递客户端的 Upgrade 头
        proxy_set_header Connection 'upgrade';                   # 标记为升级连接

        # 原始请求信息传递
        proxy_set_header Host $host;                             # 原始域名
        proxy_set_header X-Real-IP $remote_addr;                 # 客户端真实 IP（直连时直接就是客户端 IP）
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; # 代理链 IP 列表
        proxy_set_header X-Forwarded-Proto $scheme;              # 原始协议（http 或 https）
        proxy_set_header X-Forwarded-Host $host;                 # 原始 Host 头
        proxy_set_header X-Forwarded-Port $server_port;          # 用户访问的端口

        # 超时优化，应对 AI 接口长响应
        proxy_connect_timeout 300s;                              # 连接后端超时
        proxy_send_timeout 300s;                                 # 向后端发送请求超时
        proxy_read_timeout 300s;                                 # 等待后端响应超时

        # 关闭缓冲，保证流式输出 (SSE) 即时送达
        proxy_buffering off;                                     # 关闭代理缓冲
        proxy_cache off;                                         # 关闭缓存
        proxy_cache_bypass $http_upgrade;                        # 对升级请求（WebSocket）绕过缓存
    }

    # Nginx 自身健康检查端点
    location /nginx-health {
        access_log off;                                          # 不记录该端点的访问日志
        return 200 "healthy\n";                                  # 直接返回 200 和文本
        add_header Content-Type text/plain;                      # 设置 Content-Type
    }
}
```

#### [](https://linux.do/t/topic/2140889#p-17651625-apipem-apikey-43)api.pem 和 api.key

> 这里我们去cloudflare 获取

[![image](https://cdn3.ldstatic.com/optimized/4X/5/9/0/5904ae5849cb2fe2104513d93165d2ed8a570ce9_2_690x299.png)](https://cdn3.ldstatic.com/original/4X/5/9/0/5904ae5849cb2fe2104513d93165d2ed8a570ce9.png "image")

> 创建一个证书

[![image](https://cdn3.ldstatic.com/optimized/4X/2/a/a/2aa61ce6e70b45f66c0f512bb6c6e72ff6f4d217_2_690x315.png)](https://cdn3.ldstatic.com/original/4X/2/a/a/2aa61ce6e70b45f66c0f512bb6c6e72ff6f4d217.png "image")

> 输入一下我们要的二级域名，点击创建

[![image](https://cdn3.ldstatic.com/optimized/4X/7/3/a/73a36a72f2153262449df6ca14eb65857957e510_2_690x284.png)](https://cdn3.ldstatic.com/original/4X/7/3/a/73a36a72f2153262449df6ca14eb65857957e510.png "image")

> 我们就得到了 api.pem 和 api.key 复制粘贴进去，记得这个页面还有个确认要点

[![image](https://cdn3.ldstatic.com/optimized/4X/f/b/a/fba98a2cabe2927af9811513b7463c365e0c8c70_2_690x297.png)](https://cdn3.ldstatic.com/original/4X/f/b/a/fba98a2cabe2927af9811513b7463c365e0c8c70.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-3dns-44)3、配置DNS解析服务

> **如果不想配置nginx和SSL，只想单纯的通过域名解析到IP，看下面的文字说明**
> 
> 如果不需要CF代理，直接通过dns解析到ip地址 那么关闭代理状态就可以了
> 
> 也不需要配置nginx和SSL
> 
> 比如我直接用newapi的3000接口
> 
> 这里通过api.wudike.online映射到我的ip后
> 
> 通过api.wudike.online:3000就可以直接访问到我的newapi项目了
> 
> 因为DNS解析需要时间1-10分钟，所以我把DNS的步骤提前了，我们后面的步骤走完就可以直接通过我们的二级域名访问我们的项目了

[![image](https://cdn3.ldstatic.com/optimized/4X/d/8/9/d89434cafe640af28b5ab8c61bad07e44da4a0b7_2_690x252.png)](https://cdn3.ldstatic.com/original/4X/d/8/9/d89434cafe640af28b5ab8c61bad07e44da4a0b7.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-4-45)4、打开防火墙

#### [](https://linux.do/t/topic/2140889#p-17651625-linux-46)Linux 防火墙打开

> 上文讲了如何判断防火墙是否启用等等，这里就不过多赘述了
> 
> 打开443和80端口，并且重载防火墙

```bash
# 打开443和80端口，并且重载防火墙
firewall-cmd --permanent --add-port=443/tcp && firewall-cmd --permanent --add-port=80/tcp && firewall-cmd --reload

# 关闭 3000 端口
firewall-cmd --permanent --remove-port=3000/tcp && firewall-cmd --reload
```

> 查看防火墙是否开放443和80端口：`firewall-cmd --list-ports`
> 
> 这个警告不用理会，只是提醒我们服务器上还有个 `docker` zone，但外部访问走 `public` 区域，80/443 已经在正确的区域放行了

```bash
[root@VM-0-16-centos proxy]# firewall-cmd --list-ports
You're performing an operation over default zone ('public'),
but your connections/interfaces are in zone 'docker' (see --get-active-zones)
You most likely need to use --zone=docker option.

443/tcp 80/tcp
```

#### [](https://linux.do/t/topic/2140889#p-17651625-h-47)服务商打开安全组

> 在上文中我已经讲解了怎么进入安全组了，这里就不过多赘述了，记得把之前的3000端口给关闭掉，虽然我们通过linux防火墙已经关闭了，但怎么安全怎么来

[![image](https://cdn3.ldstatic.com/optimized/4X/9/c/5/9c5de8496b72f64de2a1c482754c9fa393819c2c_2_689x338.png)](https://cdn3.ldstatic.com/original/4X/9/c/5/9c5de8496b72f64de2a1c482754c9fa393819c2c.png "image")

### [](https://linux.do/t/topic/2140889#p-17651625-h-5docker-composenginx-48)5、修改docker compose文件，添加nginx

> 该文件内容是完整的，但里面参数也需要修改一下
> 
> 现在new-api不直接对外提供服务，只能内网访问，后面通过nginx反向代理到443端口，对外提供服务
> 
> 包含![:warning:](https://cdn.ldstatic.com/images/emoji/twemoji/warning.png?v=15 ":warning:")的参数是需要修改的，包含![:red_question_mark:](https://cdn.ldstatic.com/images/emoji/twemoji/red_question_mark.png?v=15 ":red_question_mark:")的是可修改的，其他的可以照抄

```yaml
# newapi docker-compose 配置参考：  
# https://docs.newapi.ai/zh/docs/installation/config-maintenance/docker-compose-yml  
# 启动的全部服务  
services:  
  # 服务名  
  new-api:  
    # 镜像名  
    image: calciumion/new-api:latest  
    # 容器名  
    container_name: new-api  
    # 退出时总是自动重启，确保服务意外挂掉后能恢复。  
    restart: always  
    # 启动容器后，会执行这个自定义命令，它将应用的日志目录设置为 /app/logs    command: --log-dir /app/logs  
    # 端口映射  
    ports:  
      - '3000'  # 改成 expose，不再对外暴露端口  
    # 卷挂载  
    volumes:  
      - ./newapi/data:/data  
      - ./newapi/logs:/app/logs  
    # 环境变量  
    environment:  
      - SQL_DSN=postgresql://root:123456@postgres:5432/new-api # ⚠️ 请修改密码  
      #      - SQL_DSN=root:123456@tcp(mysql:3306)/new-api  # 如果用mysql的话，取消这条注释，并注释上面那条  
      - REDIS_CONN_STRING=redis://redis  
      # 设置容器时区为上海  
      - TZ=Asia/Shanghai  
      # 是否启用错误日志记录  
      - ERROR_LOG_ENABLED=true  
      # 是否启用批量更新 batch update enabled      - BATCH_UPDATE_ENABLED=true  
    #      - STREAMING_TIMEOUT=300  # 流模式无响应超时时间，单位秒，默认120秒，如果出现空补全可以尝试改为更大值  
    #      - SESSION_SECRET=random_string  # 多机部署时设置，必须修改这个随机字符串！！  
    #      - SYNC_FREQUENCY=60  # 如果需要定期数据库同步，请取消注释  
    # 定义启动顺序，它会等待 rpa、redis、postgres 容器启动后，再启动  
    depends_on:  
      - redis  
      - postgres  
      #      - mysql  # 如果用mysql的话，取消这条注释，并注释上面那条  
      - cpa  
    # 心跳检查，在容器内检查，间隔30s，超时时间10s，重复机制3次  
    healthcheck:  
      # test的内容是向本机（容器内）发送一个请求，如果在响应中找不到success关键字就报错  
      test:  
        [  
          'CMD-SHELL',  
          "wget -q -O - http://localhost:3000/api/status | grep -o '\"success\":\\s*true' || exit 1",  
        ]  
      interval: 30s  
      timeout: 10s  
      retries: 3  
    # docker 网络  
    networks:  
      - newapi-network  
  
  # 下面的同上，不同的参数我再做解释  
  redis:  
    image: redis:latest  
    container_name: redis  
    restart: always  
    networks:  
      - newapi-network  
  
  postgres:  
    image: postgres:15  
    container_name: postgres  
    restart: always  
    environment:  
      # 数据库用户名  
      POSTGRES_USER: root # ❓ 设置用户名，改为你自己的  
      # 数据库密码  
      POSTGRES_PASSWORD: 123456 # ⚠️ 设置密码，改为你自己的  
      # 数据库名  
      POSTGRES_DB: new-api  
    volumes:  
      - pg_data:/var/lib/postgresql/data  
  #    ports:  
  #      - "5432:5432"  # 如果这个服务要对外，需要解开这个注释  
    networks:  
      - newapi-network  
  
  #  mysql:  
  #    image: mysql:8.2  #    container_name: mysql  #    restart: always  #    environment:  #      MYSQL_ROOT_PASSWORD: 123456  # ⚠️ 设置密码，改为你自己的  
  #      MYSQL_DATABASE: new-api  
  #    volumes:  #      - mysql_data:/var/lib/mysql  #    ports:  #      - "3306:3306"  # 如果这个服务要对外，需要解开这个注释  
  
  # cpa服务  
  cpa:  
    image: eceasy/cli-proxy-api:latest  
    container_name: cpa  
    #   ports:  
    #     - "9999:8317" # ❓因为这次是通过newpai对外提供服务，cpa只是作为认证文件管理工具  
    volumes:  
      - ./cpa/config.yaml:/CLIProxyAPI/config.yaml # 配置文件输出  
      - ./cpa/auths:/root/.cli-proxy-api # 认证文件 config.yaml 中的 ~ 代表主目录，在linux中就是 /root      - ./cpa/logs:/CLIProxyAPI/logs # 日志文件输出  
    restart: always  
    networks:  
      - newapi-network  
  
  # Nginx 反向代理服务 用于做SSL  
  nginx:  
    image: nginx:alpine  
    container_name: nginx  
    restart: always  
    ports:  
      - '80:80'  
      - '443:443'  
    volumes:  
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro  
      - ./nginx/conf.d:/etc/nginx/conf.d:ro  
      - ./nginx/ssl:/etc/nginx/ssl:ro  
      - ./nginx/logs:/var/log/nginx  
    depends_on:  
      - new-api  
    networks:  
      - newapi-network  
  
# 顶级挂载，避免文件权限问题，挂载地址：/var/lib/docker/volumes/pg_data  
volumes:  
  pg_data:  
#  mysql_data:  
  
# 定义网络（顶级）  
networks:  
  newapi-network:  
# 桥接模式  
    driver: bridge
```

### [](https://linux.do/t/topic/2140889#p-17651625-h-6docker-compose-49)6、启动我们的docker compose

> 之前也讲过怎么关闭与启动这里就放几个命令
> 
> 关闭：`docker compose down`
> 
> 启动：`docker compose up -d`
> 
> 启动完成后就可以访问我们的二级域名转到我们的项目了

[![image](https://cdn3.ldstatic.com/optimized/4X/f/8/8/f88db5032a3c5c6758105454da872604a7f18785_2_690x357.jpeg)](https://cdn3.ldstatic.com/original/4X/f/8/8/f88db5032a3c5c6758105454da872604a7f18785.jpeg "image")

> 并且通过了CF的代理，DNS也不是直接转向我们机器的ip，这样就大大滴安全了（并不）

[![image](https://cdn3.ldstatic.com/original/4X/d/5/6/d56a5f7a7c698993b4178168ca3d2b425a7832bf.png)](https://cdn3.ldstatic.com/original/4X/d/5/6/d56a5f7a7c698993b4178168ca3d2b425a7832bf.png "image")

> 测试我们最关心的 反代问题，没问题，文章完结撒花![:cherry_blossom:](https://cdn.ldstatic.com/images/emoji/twemoji/cherry_blossom.png?v=15 ":cherry_blossom:")

[![image](https://cdn3.ldstatic.com/optimized/4X/7/a/1/7a10aea538ed8858555e7556711c57568b4d4c1b_2_690x437.png)](https://cdn3.ldstatic.com/original/4X/7/a/1/7a10aea538ed8858555e7556711c57568b4d4c1b.png "image")

## [](https://linux.do/t/topic/2140889#p-17651625-h-50)参考文章

[全平台 Docker 部署 CPA(CLIProxyAPI Plus) 灵活定制指南 (Linux/Windows)——接入Codex - 掘金](https://juejin.cn/post/7617781226364092450#heading-8)

[【教程】2026版 小白也能看懂的自建Cloudflare临时邮箱教程（域名邮箱） - 文档共建 - LINUX DO](https://linux.do/t/topic/1666961)