const warnedStatuses = new Set();

const getValue = (row, key) => {
    const value = row && row[key];
    return value == null ? '' : String(value).trim();
};

const parseDate = (value) => {
    if (value == null || String(value).trim() === '') return null;

    const dateString = String(value).trim();
    const dayFirstMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    let date;

    if (dayFirstMatch) {
        const day = Number(dayFirstMatch[1]);
        const month = Number(dayFirstMatch[2]);
        const year = Number(dayFirstMatch[3]);
        date = new Date(year, month - 1, day);

        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return null;
        }
    } else {
        date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return null;
    }

    return date;
};

const getDaysDifference = (targetDateString) => {
    const targetValue = targetDateString == null ? '' : String(targetDateString).trim();
    if (!targetValue) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = parseDate(targetValue);
    if (!targetDate) return null;

    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const normalizeTaskStatus = (row) => {
    const status = getValue(row, 'Status');
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus.includes('completed') || normalizedStatus.includes('done') || normalizedStatus.includes('selesai')) {
        return 'Completed';
    }
    if (
        normalizedStatus.includes('on going') ||
        normalizedStatus.includes('ongoing') ||
        normalizedStatus.includes('in progress') ||
        normalizedStatus.includes('progress') ||
        normalizedStatus.includes('wip')
    ) {
        return 'On Going';
    }
    if (
        normalizedStatus.includes('plan') ||
        normalizedStatus.includes('not started') ||
        normalizedStatus.includes('belum')
    ) {
        return 'Planning';
    }

    if (status) {
        const warningKey = normalizedStatus;
        if (!warnedStatuses.has(warningKey)) {
            console.warn(`Unrecognized project task status "${status}"; deriving status from actual dates.`);
            warnedStatuses.add(warningKey);
        }
    }

    if (parseDate(getValue(row, 'Actual End'))) return 'Completed';
    if (parseDate(getValue(row, 'Actual Start'))) return 'On Going';
    return 'Planning';
};

const processTask = (row) => {
    const computedStatus = normalizeTaskStatus(row);
    const planEnd = getValue(row, 'Plan End');
    const normalizedRow = Object.fromEntries(
        Object.entries(row || {}).map(([key, value]) => [
            key,
            typeof value === 'string' ? value.trim() : value
        ])
    );
    let daysRemaining = null;
    let condition = 'On Track';

    if (computedStatus !== 'Completed' && planEnd) {
        daysRemaining = getDaysDifference(planEnd);
        if (daysRemaining !== null && daysRemaining < 0) {
            condition = 'Delayed';
        } else if (daysRemaining !== null && daysRemaining <= 10) {
            condition = 'Due Soon';
        }
    }

    return {
        ...normalizedRow,
        computedStatus,
        condition,
        daysRemaining
    };
};

const summarizeProjects = (tasks) => {
    const projectsByName = new Map();

    tasks.forEach((task) => {
        const projectName = getValue(task, 'Project Name');
        if (!projectName) return;

        const projectKey = projectName.toLowerCase();
        if (!projectsByName.has(projectKey)) {
            projectsByName.set(projectKey, { projectName, tasks: [] });
        }
        projectsByName.get(projectKey).tasks.push(task);
    });

    return Array.from(projectsByName.values(), ({ projectName, tasks: projectTasks }) => {
        const activeTasks = projectTasks.filter((task) => task.computedStatus === 'On Going');
        const planningTasks = projectTasks.filter((task) => task.computedStatus === 'Planning');
        const completedTasks = projectTasks.filter((task) => task.computedStatus === 'Completed');
        const allCompleted = completedTasks.length === projectTasks.length;
        const allPlanning = planningTasks.length === projectTasks.length;
        const firstActiveIndex = projectTasks.findIndex((task) => task.computedStatus === 'On Going');
        const phaseTask = firstActiveIndex !== -1
            ? projectTasks[firstActiveIndex]
            : allCompleted
                ? projectTasks[projectTasks.length - 1]
                : projectTasks.find((task) => task.computedStatus === 'Planning');
        const nextTask = projectTasks.find((task, index) =>
            task.computedStatus === 'Planning' && index > firstActiveIndex
        ) || (firstActiveIndex === -1 ? planningTasks[0] : null);
        const completedCount = completedTasks.length;
        const firstTask = projectTasks[0];
        const conditionPriority = { 'On Track': 0, 'Due Soon': 1, Delayed: 2 };
        const condition = activeTasks.reduce((worstCondition, task) => {
            return conditionPriority[task.condition] > conditionPriority[worstCondition]
                ? task.condition
                : worstCondition;
        }, 'On Track');

        return {
            projectName,
            projectStatus: allCompleted ? 'Completed' : allPlanning ? 'Planning' : 'On Going',
            currentPhase: phaseTask ? getValue(phaseTask, 'Phase') : '',
            condition: activeTasks.length ? condition : null,
            activeTasks,
            nextTask: nextTask || null,
            tasks: projectTasks,
            progress: {
                completed: completedCount,
                total: projectTasks.length
            },
            projectManager: getValue(firstTask, 'Project Manager'),
            type: getValue(firstTask, 'Commercial / Non Commercial?'),
            priority: getValue(firstTask, 'Priority'),
            highlight: getValue(firstTask, 'Highlight Project')
        };
    });
};

module.exports = {
    getDaysDifference,
    parseDate,
    processTask,
    summarizeProjects
};
