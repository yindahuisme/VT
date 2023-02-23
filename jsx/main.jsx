// 获取当前项目名
// 参数：
function getProjectName(args) {
    //开启全局qe
    app.enableQE()

    var appName = app.project.name
    return appName.split('.')[0]
}

// 清空当前项目轨道
// 参数：
function cleanProject(args) {
    //清空视频,音频轨道
    var vts = app.project.activeSequence.videoTracks
    var ats = app.project.activeSequence.audioTracks
    cleanTracksItem(vts)
    cleanTracksItem(ats)

    function cleanTracksItem(ts) {
        for (var i = ts.length - 1; i >= 0; i--) {
            var items = ts[i].clips
            for (var j = items.length - 1; j >= 0; j--) {
                items[j].remove(0, 0)
            }
        }
    }
}

// 获取当前项目轨道
// 参数：轨道类型
function getProjectTracks(args) {
    var tracks = []
    if (args == '视频') {
        var vts = app.project.activeSequence.videoTracks
        for (var i = 0; i < vts.length; i++) {
            tracks.push(vts[i].name)
        }
        return tracks.join()
    } else if (args == '音频') {

        var ats = app.project.activeSequence.audioTracks
        for (var i = 0; i < ats.length; i++) {
            tracks.push(ats[i].name)
        }
        return tracks.join()
    } else {
        return tracks.join()
    }
}

// 获取当前项目时间线指针当前时间
// 参数：
function getTimeLineSecond(args) {
    return Math.floor(qe.project.getActiveSequence().CTI.ticks / 254016000) / 1000
}

// 插入轨道素材
// 参数：#分割轨道素材信息，|分割不同轨道素材
function insertTrackMats(args) {
    var tmpMatInfoLists = args.split('|')
    for (var item_index = 0; item_index < tmpMatInfoLists.length; item_index++) {
        var tmpMatInfo = tmpMatInfoLists[item_index]
        var tmpMatInfoList = tmpMatInfo.split('#')
        //待插入project_item
        var target_project_item = null
        //待插入轨道名
        var trackName = tmpMatInfoList[0]
        //待匹配素材轨道点位
        var matPointList = tmpMatInfoList[1].split(',')
        //素材文件打点点位
        var matFilePointList = tmpMatInfoList[2].split(',')
        //素材文件路径
        var file_path = tmpMatInfoList[3]
        //卡点变速
        var freePointSpeed = parseFloat(tmpMatInfoList[4])
        //当前毫秒时间戳
        var curTimeStamp = tmpMatInfoList[5]

        // 加载素材文件到项目中
        getProjectByPath(file_path)


        // 加载外部素材文件到项目
        if (target_project_item == null) {
            app.project.importFiles(file_path)
            getProjectByPath(file_path)
        }

        //遍历待插入素材段
        for (var i = 0; i < matFilePointList.length - 1; i++) {
            //打点时长
            var tmpPointDuration = parseFloat(matFilePointList[i + 1]) - parseFloat(matFilePointList[i])

            //待匹配时长
            var tmpMatchDuration = parseFloat(matPointList[i + 1]) - parseFloat(matPointList[i])

            //第二段加速倍率
            var tmp2Speed = freePointSpeed
            //第二段匹配时长
            var tmp2Duration = 0
            //第二段打点时长
            var tmp2PointDuration = 0
            if(tmp2Speed!=0){
                var tmpMinDuration = Math.min(tmpPointDuration,tmpMatchDuration)
                tmp2PointDuration = Math.min(tmpMinDuration/tmp2Speed*Math.max(0.3,1-tmpMinDuration),0.3)*tmp2Speed
                tmp2Duration = tmp2PointDuration/tmp2Speed
            }

            //第一段匹配时长
            var tmp1Duration = tmpMatchDuration - tmp2Duration
            //第一段打点时长
            var tmp1PointDuration = tmpPointDuration - tmp2PointDuration
            //第一段加速倍率
            var tmp1Speed = tmp1PointDuration/tmp1Duration
            

            var inTime = parseFloat(matPointList[i])
            var inPointTime = parseFloat(matFilePointList[i])
            insertMatToTrack(tmp1Duration, tmp1Speed, trackName)
            inTime += tmp1Duration
            inPointTime += tmp1PointDuration
            if (tmp2Speed != 0) {
                insertMatToTrack(tmp2Duration, tmp2Speed, trackName)

            }
        }
    }

    //-----------------------
    function insertMatToTrack(matchDuration, pointSpeed, trackName) {

        //待插入track
        var tmpTrack = getTrackByName(trackName)
        //clip开始结束
        var tmpSpeedStart = inPointTime
        var tmpSpeedEnd = inPointTime + app.project.activeSequence.timebase/254016000000
        // 生成临时名
        var tmpClipName = target_project_item.name.replace('\.', '_') + '_片段' + curTimeStamp
        //插入素材到轨道
        var tmpIsAudio = trackName.split(' ')[0] == '视频' ? 0 : 1
        var tmpIsVideo = trackName.split(' ')[0] == '视频' ? 1 : 0
        var tmpClip = target_project_item.createSubClip(tmpClipName, tmpSpeedStart, tmpSpeedEnd, 0, tmpIsVideo, tmpIsAudio)
        tmpTrack.overwriteClip(tmpClip, inTime)
        //变速
        getQeTrackItemByName(trackName, tmpClipName).setSpeed(pointSpeed, '', false, false, false)
        //适应屏幕
        getQeTrackItemByName(trackName, tmpClipName).setScaleToFrameSize(true)
        //拉升
        var tmpTrackItem = getTrackItemByName(trackName, tmpClipName)
        var tmpEndTime = new Time()
        tmpEndTime.seconds = inTime + matchDuration
        try {
            tmpTrackItem.end = tmpEndTime
        } catch (e) {
            //效果达到，但是会报错，捕获
        }
    }

    function getProjectByPath(file_path) {
        var project_items = app.project.rootItem.children
        for (var i = 0; i < project_items.length; i++) {
            var tmp_item = project_items[i]
            if (file_path == tmp_item.getMediaPath() && tmp_item.name.split('\.').length == 2) {
                target_project_item = tmp_item
            }
        }
    }

    function getTrackByName(trackName) {
        var tmpTracks = []
        if (trackName.split(' ')[0] == '视频') {
            tmpTracks = app.project.activeSequence.videoTracks
        } else {
            tmpTracks = app.project.activeSequence.audioTracks
        }
        for (var i = tmpTracks.length - 1; i >= 0; i--) {
            if (tmpTracks[i].name == trackName) {
                return tmpTracks[i]
            }
        }
    }

    function getTrackItemByName(trackName, clipName) {
        var tmpTrack = getTrackByName(trackName)

        for (var i = tmpTrack.clips.numItems - 1; i >= 0; i--) {
            var tmpItem = tmpTrack.clips[i]
            if (tmpItem.name == clipName) {
                return tmpItem
            }
        }

    }

    function getQeTrackItemByName(trackName, clipName) {
        var tmpTrack
        if (trackName.split(' ')[0] == '视频') {
            var tmpTracksLength = qe.project.getActiveSequence().numVideoTracks
            for (var i = tmpTracksLength - 1; i >= 0; i--) {
                var tmpVideoTrack = qe.project.getActiveSequence().getVideoTrackAt(i)
                if (tmpVideoTrack.name == trackName) {
                    tmpTrack = tmpVideoTrack
                    break
                }
            }
        } else {
            var tmpTracksLength = qe.project.getActiveSequence().numAudioTracks
            for (var i = tmpTracksLength - 1; i >= 0; i--) {
                var tmpAudioTrack = qe.project.getActiveSequence().getAudioTrackAt(i)
                if (tmpAudioTrack.name == trackName) {
                    tmpTrack = tmpAudioTrack
                    break
                }
            }
        }

        for (var i = tmpTrack.numItems - 1; i >= 0; i--) {
            var tmpItem = tmpTrack.getItemAt(i)
            if (tmpItem.getProjectItem() != null && tmpItem.name == clipName) {
                return tmpItem
            }
        }

    }
    //-----------------------
}


// 删除指定轨道素材
// 参数：轨道名
function delTrackMats(args) {
    var trackName = args.split('#')[0]
    var curTimeStamp = args.split('#')[1]


    var tmpActiveSequence = qe.project.getActiveSequence()
    if (trackName.split(' ')[0] == '视频') {
        var tracksLength = tmpActiveSequence.numVideoTracks
        for (var i = tracksLength - 1; i >= 0; i--) {
            if (tmpActiveSequence.getVideoTrackAt(i).name == trackName) {
                var trackItemLength = tmpActiveSequence.getVideoTrackAt(i).numItems
                for (var j = trackItemLength - 1; j >= 0; j--) {
                    var tmpItem = tmpActiveSequence.getVideoTrackAt(i).getItemAt(j)
                    // 判断clipName
                    if (tmpItem.getProjectItem() != null && tmpItem.name.split('_片段')[1] == curTimeStamp) {
                        tmpItem.remove()
                    }

                }

            }
        }

    }
    if (trackName.split(' ')[0] == '音频') {
        var tracksLength = tmpActiveSequence.numAudioTracks
        for (var i = tracksLength - 1; i >= 0; i--) {
            if (tmpActiveSequence.getAudioTrackAt(i).name == trackName) {
                var trackItemLength = tmpActiveSequence.getAudioTrackAt(i).numItems
                for (var j = trackItemLength - 1; j >= 0; j--) {
                    var tmpItem = tmpActiveSequence.getAudioTrackAt(i).getItemAt(j)
                    // 判断clipName
                    if (tmpItem.getProjectItem() != null && tmpItem.name.split('_片段')[1] == curTimeStamp) {
                        tmpItem.remove()
                    }
                }

            }
        }
    }

}